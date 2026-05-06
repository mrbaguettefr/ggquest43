import { Math as PhaserMath, Scene } from 'phaser';
import type { BattleResult, Encounter, GameSession } from '../gameTypes.ts';

type BattleState = 'choosing-action' | 'choosing-target' | 'done';
type ActionChoice = 'attack' | 'skip' | 'flee';

const ACTIONS: ActionChoice[] = ['attack', 'skip', 'flee'];
const ACTION_LABELS: Record<ActionChoice, string> = {
    attack: 'Attack',
    skip: 'Skip',
    flee: 'Flee',
};

const CANVAS_W = 1024;
const CANVAS_H = 768;
const HERO_X = 220;
const HERO_Y_START = 430;
const HERO_Y_STEP = 130;
const ENEMY_X = 760;
const ENEMY_Y_START = 320;
const ENEMY_Y_STEP = 130;
const SPRITE_SCALE = 0.45;

export class Battle extends Scene
{
    private session: GameSession;
    private encounter: Encounter;
    private state: BattleState = 'choosing-action';
    private selectedAction = 0;
    private selectedTargetIndex = 0;

    private heroSprites: Phaser.GameObjects.Sprite[] = [];
    private enemySprites: Phaser.GameObjects.Sprite[] = [];
    private enemyLabels: Phaser.GameObjects.Text[] = [];
    private commandWindow: Phaser.GameObjects.Container;
    private commandTexts: Phaser.GameObjects.Text[] = [];
    private logText: Phaser.GameObjects.Text;
    private partyHpPanel: Phaser.GameObjects.Container;
    private partyHpLines: Phaser.GameObjects.Text[] = [];
    private finger: Phaser.GameObjects.Container | null = null;

    constructor()
    {
        super('Battle');
    }

    create(data: { session: GameSession })
    {
        this.session = data.session;

        if (!this.session.currentEncounter)
        {
            this.scene.start('Exploration', { session: this.session });
            return;
        }

        this.encounter = this.session.currentEncounter;
        this.state = 'choosing-action';
        this.selectedAction = 0;
        this.selectedTargetIndex = 0;
        this.heroSprites = [];
        this.enemySprites = [];
        this.enemyLabels = [];
        this.commandTexts = [];
        this.partyHpLines = [];
        this.finger = null;

        this.cameras.main.fadeIn(400);

        this.createBackground();
        this.createHeroSprites();
        this.createEnemySprites();
        this.createCommandWindow();
        this.createPartyHpPanel();
        this.createLogText();

        this.ensureSelectedLiveTarget();

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.input.keyboard.on('keydown', this.handleKey, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey, this);
        });
    }

    private createBackground()
    {
        this.add.image(CANVAS_W / 2, CANVAS_H / 2, 'battle-bg')
            .setDisplaySize(CANVAS_W, CANVAS_H)
            .setDepth(0);
    }

    private createHeroSprites()
    {
        const party = this.getParty();
        party.forEach((_, index) => {
            const sprite = this.add.sprite(
                HERO_X,
                HERO_Y_START + index * HERO_Y_STEP,
                'cloud-battle-idle',
            )
                .setFlipX(true)
                .setScale(SPRITE_SCALE)
                .setDepth(5)
                .play('battle-idle');
            this.heroSprites.push(sprite);
        });
    }

    private createEnemySprites()
    {
        this.encounter.enemies.forEach((enemy, index) => {
            const x = ENEMY_X;
            const y = ENEMY_Y_START + index * ENEMY_Y_STEP;

            const sprite = this.add.sprite(x, y, 'cloud-battle-idle')
                .setScale(SPRITE_SCALE)
                .setDepth(5)
                .setTint(0xaaaaee)
                .play('battle-idle');
            this.enemySprites.push(sprite);

            const label = this.add.text(x, y + 68, this.enemyLabelText(enemy), {
                fontFamily: 'Arial',
                fontSize: 15,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center',
            }).setOrigin(0.5).setDepth(6);
            this.enemyLabels.push(label);

            sprite.setInteractive({ useHandCursor: true });
            sprite.on('pointerdown', () => {
                if (this.state !== 'choosing-target') return;
                if (this.encounter.enemies[index].hp <= 0) return;
                this.selectedTargetIndex = index;
                this.resolveAttack();
            });
        });
    }

    private enemyLabelText(enemy: { name: string; hp: number; maxHp: number })
    {
        return `${enemy.name}\nHP ${enemy.hp}/${enemy.maxHp}`;
    }

    private createCommandWindow()
    {
        const panelX = 36;
        const panelY = 562;
        const panelW = 200;
        const panelH = 150;

        this.commandWindow = this.add.container(panelX, panelY).setDepth(20);

        const bg = this.add.rectangle(panelW / 2, panelH / 2, panelW, panelH, 0x000055, 0.88)
            .setStrokeStyle(3, 0x6688ff, 1);
        this.commandWindow.add(bg);

        ACTIONS.forEach((action, index) => {
            const text = this.add.text(28, 22 + index * 40, ACTION_LABELS[action], {
                fontFamily: 'Arial Black',
                fontSize: 22,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            });
            this.commandWindow.add(text);
            this.commandTexts.push(text);
        });

        this.refreshCommandWindow();
    }

    private refreshCommandWindow()
    {
        this.commandTexts.forEach((text, index) => {
            const active = this.state === 'choosing-action' && index === this.selectedAction;
            text.setText((active ? '▶ ' : '  ') + ACTION_LABELS[ACTIONS[index]]);
            text.setColor(active ? '#fff100' : '#ffffff');
        });
        this.commandWindow.setVisible(this.state === 'choosing-action');
    }

    private createPartyHpPanel()
    {
        const panelX = 600;
        const panelY = 562;
        const panelW = 380;
        const lineH = 28;

        const party = this.getParty();
        const panelH = 28 + party.length * lineH + 12;

        this.partyHpPanel = this.add.container(panelX, panelY).setDepth(20);

        const bg = this.add.rectangle(panelW / 2, panelH / 2, panelW, panelH, 0x000055, 0.88)
            .setStrokeStyle(3, 0x6688ff, 1);
        this.partyHpPanel.add(bg);

        party.forEach((hero, index) => {
            const line = this.add.text(16, 14 + index * lineH, this.heroHpText(hero), {
                fontFamily: 'Courier New',
                fontSize: 18,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            });
            this.partyHpPanel.add(line);
            this.partyHpLines.push(line);
        });
    }

    private heroHpText(hero: { name: string; hp: number; maxHp: number })
    {
        return `${hero.name.padEnd(7)} HP ${String(hero.hp).padStart(3)} / ${hero.maxHp}`;
    }

    private createLogText()
    {
        this.logText = this.add.text(CANVAS_W / 2, 718, '', {
            fontFamily: 'Arial Black',
            fontSize: 17,
            color: '#fff6c4',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: 900 },
        }).setOrigin(0.5).setDepth(20);
    }

    private handleKey(event: KeyboardEvent)
    {
        if (this.state === 'choosing-action')
        {
            this.handleActionKey(event);
        }
        else if (this.state === 'choosing-target')
        {
            this.handleTargetKey(event);
        }
    }

    private handleActionKey(event: KeyboardEvent)
    {
        if (event.key === 'ArrowUp')
        {
            this.selectedAction = PhaserMath.Wrap(this.selectedAction - 1, 0, ACTIONS.length);
            this.refreshCommandWindow();
        }
        else if (event.key === 'ArrowDown')
        {
            this.selectedAction = PhaserMath.Wrap(this.selectedAction + 1, 0, ACTIONS.length);
            this.refreshCommandWindow();
        }
        else if (event.key === 'Enter' || event.key === ' ')
        {
            this.confirmAction();
        }
    }

    private confirmAction()
    {
        const action = ACTIONS[this.selectedAction];

        if (action === 'flee')
        {
            this.finishBattle({ won: false, encounter: this.encounter, log: ['The party fled!'] });
            return;
        }

        if (action === 'skip')
        {
            this.doEnemyTurn(['Hero skipped their turn.']);
            return;
        }

        this.ensureSelectedLiveTarget();
        this.state = 'choosing-target';
        this.refreshCommandWindow();
        this.refreshFinger();
        this.logText.setText('Choose a target. ↑↓ to select, Enter to confirm, Esc to go back.');
    }

    private handleTargetKey(event: KeyboardEvent)
    {
        if (event.key === 'ArrowUp')
        {
            this.moveSelectedTarget(-1);
        }
        else if (event.key === 'ArrowDown')
        {
            this.moveSelectedTarget(1);
        }
        else if (event.key === 'Enter' || event.key === ' ')
        {
            this.resolveAttack();
        }
        else if (event.key === 'Escape')
        {
            this.state = 'choosing-action';
            this.refreshCommandWindow();
            this.refreshFinger();
            this.logText.setText('');
        }
    }

    private moveSelectedTarget(direction: -1 | 1)
    {
        const enemies = this.encounter.enemies;
        const liveEnemies = enemies.filter((e) => e.hp > 0);
        if (liveEnemies.length === 0) return;

        let next = this.selectedTargetIndex;
        for (let steps = 0; steps < enemies.length; steps += 1)
        {
            next = PhaserMath.Wrap(next + direction, 0, enemies.length);
            if (enemies[next].hp > 0)
            {
                this.selectedTargetIndex = next;
                this.refreshFinger();
                return;
            }
        }
    }

    private resolveAttack()
    {
        const liveEnemies = this.encounter.enemies.filter((e) => e.hp > 0);
        if (liveEnemies.length === 0) return;

        const log: string[] = [];
        for (const hero of this.getParty())
        {
            const target = this.getSelectedLiveEnemy();
            if (!target) break;

            if (target.flying && hero.range !== 'ranged')
            {
                log.push(`${hero.name} swings under ${target.name}.`);
                continue;
            }

            const damage = hero.key === 'cloud' && target.boss ? hero.damage + 8 : hero.damage;
            target.hp = Math.max(0, target.hp - damage);
            log.push(`${hero.name} uses ${hero.special} for ${damage}.`);
        }

        this.refreshEnemyLabels();
        this.refreshEnemySprites();

        if (this.encounter.enemies.every((e) => e.hp <= 0))
        {
            this.refreshFinger();
            this.finishBattle({ won: true, encounter: this.encounter, log });
            return;
        }

        this.doEnemyTurn(log);
    }

    private doEnemyTurn(log: string[])
    {
        for (const enemy of this.encounter.enemies.filter((e) => e.hp > 0))
        {
            const liveHeroes = this.getParty().filter((h) => h.hp > 0);
            if (liveHeroes.length === 0) break;

            const target = liveHeroes[Math.floor(Math.random() * liveHeroes.length)];
            target.hp = Math.max(0, target.hp - enemy.damage);
            log.push(`${enemy.name} hits ${target.name} for ${enemy.damage}.`);
        }

        this.refreshPartyHp();

        if (this.getParty().every((h) => h.hp <= 0))
        {
            this.finishBattle({ won: false, encounter: this.encounter, log });
            return;
        }

        this.state = 'choosing-action';
        this.selectedAction = 0;
        this.logText.setText(log.join('\n'));
        this.refreshCommandWindow();
        this.refreshFinger();
    }

    private finishBattle(battleResult: BattleResult)
    {
        this.state = 'done';
        this.refreshFinger();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Exploration', { session: this.session, battleResult });
        });
    }

    private refreshEnemyLabels()
    {
        this.encounter.enemies.forEach((enemy, index) => {
            this.enemyLabels[index]?.setText(this.enemyLabelText(enemy));
        });
    }

    private refreshEnemySprites()
    {
        this.encounter.enemies.forEach((enemy, index) => {
            this.enemySprites[index]?.setAlpha(enemy.hp <= 0 ? 0.2 : 1);
        });
    }

    private refreshPartyHp()
    {
        this.getParty().forEach((hero, index) => {
            this.partyHpLines[index]?.setText(this.heroHpText(hero));
        });
    }

    private refreshFinger()
    {
        if (this.finger)
        {
            this.finger.destroy();
            this.finger = null;
        }

        if (this.state !== 'choosing-target') return;

        const targetSprite = this.enemySprites[this.selectedTargetIndex];
        if (!targetSprite || this.encounter.enemies[this.selectedTargetIndex]?.hp <= 0) return;

        this.finger = this.buildFinger(targetSprite.x - 76, targetSprite.y - 8);
    }

    private buildFinger(x: number, y: number): Phaser.GameObjects.Container
    {
        const finger = this.add.container(x, y).setDepth(30);
        const stroke = 0x111111;
        const fill = 0xfff1d4;
        const cuff = this.add.rectangle(-24, 14, 18, 18, 0x3d7df2);
        const palm = this.add.rectangle(-10, 6, 28, 26, fill);
        const pointer = this.add.rectangle(16, -4, 42, 14, fill);
        const fingertip = this.add.circle(38, -4, 7, fill);
        const thumb = this.add.rectangle(3, 18, 24, 12, fill);

        cuff.setStrokeStyle(2, stroke);
        palm.setStrokeStyle(2, stroke);
        pointer.setStrokeStyle(2, stroke);
        fingertip.setStrokeStyle(2, stroke);
        thumb.setStrokeStyle(2, stroke);
        thumb.setRotation(PhaserMath.DegToRad(-24));

        finger.add([cuff, palm, pointer, fingertip, thumb]);
        return finger;
    }

    private getSelectedLiveEnemy()
    {
        this.ensureSelectedLiveTarget();
        const selected = this.encounter.enemies[this.selectedTargetIndex];
        if (selected && selected.hp > 0) return selected;
        return this.encounter.enemies.find((e) => e.hp > 0);
    }

    private ensureSelectedLiveTarget()
    {
        const selected = this.encounter.enemies[this.selectedTargetIndex];
        if (selected && selected.hp > 0) return;

        const next = this.encounter.enemies.findIndex((e) => e.hp > 0);
        if (next >= 0) this.selectedTargetIndex = next;
    }

    private getParty()
    {
        return Object.values(this.session.heroes).filter((hero) => hero.recruited);
    }
}
