import { Math as PhaserMath, Scene } from 'phaser';
import { installDebugDialog } from '../debugDialog.ts';
import { getRandomBattleMusicKey, playMusic } from '../music.ts';
import type { AreaKey, BattleResult, Enemy, Encounter, GameSession, Hero, HeroKey } from '../gameTypes.ts';

type BattleState = 'choosing-action' | 'choosing-target' | 'animating' | 'done';
type ActionChoice = 'attack' | 'skip' | 'flee';
type BattleSpriteConfig = {
    texture: string;
    animation: string;
    attackTexture?: string;
    attackAnimation?: string;
    scale: number;
    flipX: boolean;
};

const ACTIONS: ActionChoice[] = ['attack', 'skip', 'flee'];
const ACTION_LABELS: Record<ActionChoice, string> = {
    attack: 'Attack',
    skip: 'Skip',
    flee: 'Flee',
};

const BATTLE_HERO_ORDER: HeroKey[] = ['leon', 'cloud', 'mistress'];

const CANVAS_W = 1024;
const CANVAS_H = 768;
const HERO_X = 220;
const HERO_Y_START = 300;
const HERO_Y_STEP = 110;
const ENEMY_X = 760;
const ENEMY_Y_START = 320;
const ENEMY_Y_STEP = 96;
const SPRITE_SCALE = 0.45;
const BATTLE_BACKGROUND_BY_AREA: Record<AreaKey, string> = {
    plains: 'battle-bg-plains',
    dungeon: 'battle-bg-dungeon',
    'lava-underground': 'battle-bg-lava-underground',
};

export class Battle extends Scene
{
    private session: GameSession;
    private encounter: Encounter;
    private state: BattleState = 'choosing-action';
    private selectedAction = 0;
    private selectedTargetIndex = 0;
    private currentHeroTurnIndex = 0;

    private heroSprites: Phaser.GameObjects.Sprite[] = [];
    private enemySprites: Phaser.GameObjects.Sprite[] = [];
    private enemyLabels: Phaser.GameObjects.Text[] = [];
    private commandWindow: Phaser.GameObjects.Container;
    private commandHeroText: Phaser.GameObjects.Text;
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
        this.currentHeroTurnIndex = 0;
        this.heroSprites = [];
        this.enemySprites = [];
        this.enemyLabels = [];
        this.commandTexts = [];
        this.partyHpLines = [];
        this.finger = null;

        playMusic(this, getRandomBattleMusicKey(), 150);
        this.cameras.main.fadeIn(180);

        this.createBackground();
        this.createHeroSprites();
        this.createEnemySprites();
        this.createCommandWindow();
        this.createPartyHpPanel();
        this.createLogText();
        installDebugDialog(this, {
            session: this.session,
            onSessionChanged: () => {
                this.refreshBattleParty();
            }
        });

        this.ensureSelectedLiveTarget();
        this.advanceToFirstLiveHero();

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
        const textureKey = this.session.currentArea
            ? BATTLE_BACKGROUND_BY_AREA[this.session.currentArea.key]
            : BATTLE_BACKGROUND_BY_AREA.plains;

        this.add.image(CANVAS_W / 2, CANVAS_H / 2, textureKey)
            .setDisplaySize(CANVAS_W, CANVAS_H)
            .setDepth(0);
    }

    private createHeroSprites()
    {
        const party = this.getBattleParty();
        party.forEach((hero, index) => {
            const config = this.getHeroBattleSpriteConfig(hero);
            const sprite = this.add.sprite(
                HERO_X,
                HERO_Y_START + index * HERO_Y_STEP,
                config.texture,
            )
                .setFlipX(config.flipX)
                .setScale(config.scale)
                .setDepth(5)
                .play(config.animation);
            this.heroSprites.push(sprite);
        });
    }

    private getHeroBattleSpriteConfig(hero: Hero): BattleSpriteConfig
    {
        if (hero.key === 'leon')
        {
            return {
                texture: 'leon-battle-idle',
                animation: 'leon-battle-idle',
                attackTexture: 'leon-battle-attack',
                attackAnimation: 'leon-battle-attack',
                scale: SPRITE_SCALE,
                flipX: false
            };
        }

        if (hero.key === 'mistress')
        {
            return {
                texture: 'mistress-battle-idle',
                animation: 'mistress-battle-idle',
                attackTexture: 'mistress-battle-attack',
                attackAnimation: 'mistress-battle-attack',
                scale: SPRITE_SCALE,
                flipX: false
            };
        }

        return {
            texture: 'cloud-battle-idle',
            animation: 'battle-idle',
            attackTexture: 'cloud-battle-attack',
            attackAnimation: 'cloud-battle-attack',
            scale: SPRITE_SCALE,
            flipX: false
        };
    }

    private createEnemySprites()
    {
        this.encounter.enemies.forEach((enemy, index) => {
            const x = ENEMY_X;
            const position = enemy.battlefieldPosition ?? index + 1;
            const y = ENEMY_Y_START + (position - 1) * ENEMY_Y_STEP;
            const texture = enemy.battleTexture ?? 'enemy-battle-fallback-idle';
            const animation = enemy.battleAnimation ?? 'enemy-battle-fallback-idle';
            const scale = enemy.battleScale ?? SPRITE_SCALE;

            const sprite = this.add.sprite(x, y, texture)
                .setFlipX(true)
                .setScale(scale)
                .setDepth(5)
                .play(animation);

            if (!enemy.battleTexture)
            {
                sprite.setTint(0xaaaaee);
                console.warn(`[Battle] ${enemy.name}: missing battleTexture, using fallback`);
                this.add.text(x, y - sprite.displayHeight / 2 - 6, '[missing sprite]', {
                    fontFamily: 'Arial',
                    fontSize: 11,
                    color: '#ff8800',
                    stroke: '#000000',
                    strokeThickness: 2,
                }).setOrigin(0.5).setDepth(7);
            }

            this.enemySprites.push(sprite);

            const labelPosition = this.getEnemyLabelPosition(sprite);
            const label = this.add.text(labelPosition.x, labelPosition.y, this.enemyLabelText(enemy), {
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

    private getEnemyLabelPosition(sprite: Phaser.GameObjects.Sprite)
    {
        return {
            x: Math.min(CANVAS_W - 94, sprite.x + Math.max(96, sprite.displayWidth / 2 + 42)),
            y: sprite.y
        };
    }

    private enemyLabelText(enemy: { name: string; hp: number; maxHp: number; count?: number })
    {
        const count = enemy.count && enemy.count > 1 ? ` ×${enemy.count}` : '';
        return `${enemy.name}${count}\nHP ${enemy.hp}/${enemy.maxHp}`;
    }

    private createCommandWindow()
    {
        const panelX = 36;
        const panelY = 562;
        const panelW = 200;
        const panelH = 170;

        this.commandWindow = this.add.container(panelX, panelY).setDepth(20);

        const bg = this.add.rectangle(panelW / 2, panelH / 2, panelW, panelH, 0x000055, 0.88)
            .setStrokeStyle(3, 0x6688ff, 1);
        this.commandWindow.add(bg);

        this.commandHeroText = this.add.text(panelW / 2, 10, '', {
            fontFamily: 'Arial Black',
            fontSize: 15,
            color: '#88ccff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0);
        this.commandWindow.add(this.commandHeroText);

        ACTIONS.forEach((action, index) => {
            const text = this.add.text(28, 38 + index * 40, ACTION_LABELS[action], {
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
        const party = this.getBattleParty();
        const currentHero = party[this.currentHeroTurnIndex];
        if (this.commandHeroText)
        {
            this.commandHeroText.setText(currentHero ? `${currentHero.name}'s Turn` : '');
        }

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

        const party = this.getBattleParty();
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

    private async confirmAction()
    {
        const action = ACTIONS[this.selectedAction];

        if (action === 'flee')
        {
            this.finishBattle({ won: false, encounter: this.encounter, log: ['The party fled!'] });
            return;
        }

        if (action === 'skip')
        {
            const party = this.getBattleParty();
            const hero = party[this.currentHeroTurnIndex];
            const msg = hero ? `${hero.name} skipped their turn.` : 'Hero skipped their turn.';
            await this.advanceHeroTurn([msg]);
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

    private async resolveAttack()
    {
        if (this.state === 'animating' || this.state === 'done') return;

        const liveEnemies = this.encounter.enemies.filter((e) => e.hp > 0);
        if (liveEnemies.length === 0) return;

        this.state = 'animating';
        this.refreshCommandWindow();
        this.refreshFinger();

        const log: string[] = [];
        const party = this.getBattleParty();
        const hero = party[this.currentHeroTurnIndex];

        if (hero && hero.hp > 0)
        {
            const target = this.getSelectedLiveEnemy();
            if (target)
            {
                await this.playHeroAttack(hero, this.currentHeroTurnIndex);

                if (target.flying && hero.range !== 'ranged')
                {
                    log.push(`${hero.name} swings under ${target.name}.`);
                }
                else
                {
                    const damage = hero.key === 'cloud' && target.boss ? hero.damage + 8 : hero.damage;
                    const slain = this.applyDamageToEnemy(target, damage);
                    const slainText = slain > 0 ? ` (${slain} slain)` : '';
                    log.push(`${hero.name} uses ${hero.special} for ${damage}${slainText}.`);
                    this.refreshEnemyLabels();
                    this.refreshEnemySprites();
                    await this.wait(140);
                }
            }
        }

        this.refreshEnemyLabels();
        this.refreshEnemySprites();

        if (this.encounter.enemies.every((e) => e.hp <= 0))
        {
            this.refreshFinger();
            this.finishBattle({ won: true, encounter: this.encounter, log });
            return;
        }

        await this.advanceHeroTurn(log);
    }

    private async advanceHeroTurn(log: string[])
    {
        const party = this.getBattleParty();
        let next = this.currentHeroTurnIndex + 1;
        while (next < party.length && party[next].hp <= 0)
        {
            next++;
        }

        if (next >= party.length)
        {
            await this.doEnemyTurn(log);
        }
        else
        {
            this.currentHeroTurnIndex = next;
            this.logText.setText(log.join('\n'));
            this.state = 'choosing-action';
            this.selectedAction = 0;
            this.refreshCommandWindow();
            this.refreshPartyHp();
            this.refreshFinger();
        }
    }

    private async doEnemyTurn(log: string[])
    {
        this.state = 'animating';
        this.refreshCommandWindow();
        this.refreshFinger();

        const liveEnemies = this.encounter.enemies.filter((e) => e.hp > 0);
        for (const enemy of liveEnemies)
        {
            const liveHeroes = this.getBattleParty().filter((h) => h.hp > 0);
            if (liveHeroes.length === 0) break;

            const target = liveHeroes[Math.floor(Math.random() * liveHeroes.length)];
            const enemyIndex = this.encounter.enemies.indexOf(enemy);
            await this.playEnemyAttack(enemyIndex);
            target.hp = Math.max(0, target.hp - enemy.damage);
            log.push(`${enemy.name} hits ${target.name} for ${enemy.damage}${enemy.count && enemy.count > 1 ? ` (×${enemy.count})` : ''}.`);
            this.refreshPartyHp();
            await this.wait(140);
        }

        this.refreshPartyHp();

        if (this.getBattleParty().every((h) => h.hp <= 0))
        {
            this.finishBattle({ won: false, encounter: this.encounter, log });
            return;
        }

        this.advanceToFirstLiveHero();
        this.state = 'choosing-action';
        this.selectedAction = 0;
        this.logText.setText(log.join('\n'));
        this.refreshCommandWindow();
        this.refreshPartyHp();
        this.refreshFinger();
    }

    private advanceToFirstLiveHero()
    {
        const party = this.getBattleParty();
        this.currentHeroTurnIndex = 0;
        while (this.currentHeroTurnIndex < party.length && party[this.currentHeroTurnIndex].hp <= 0)
        {
            this.currentHeroTurnIndex++;
        }
    }

    private async playHeroAttack(hero: Hero, heroIndex: number)
    {
        const sprite = this.heroSprites[heroIndex];
        if (!sprite) return;

        const config = this.getHeroBattleSpriteConfig(hero);
        await this.playAttackThenIdle(
            sprite,
            config.attackTexture,
            config.attackAnimation,
            config.animation,
        );
    }

    private async playEnemyAttack(enemyIndex: number)
    {
        const enemy = this.encounter.enemies[enemyIndex];
        const sprite = this.enemySprites[enemyIndex];
        if (!enemy || !sprite) return;

        await this.playAttackThenIdle(
            sprite,
            enemy.battleAttackTexture,
            enemy.battleAttackAnimation,
            enemy.battleAnimation ?? 'enemy-battle-fallback-idle',
        );
    }

    private playAttackThenIdle(
        sprite: Phaser.GameObjects.Sprite,
        attackTexture: string | undefined,
        attackAnimation: string | undefined,
        idleAnimation: string,
    ) {
        if (attackAnimation && !this.anims.exists(attackAnimation)) {
            console.warn(`[Battle] Attack animation "${attackAnimation}" not found, falling back to idle`);
        }
        if (attackTexture && !this.textures.exists(attackTexture)) {
            console.warn(`[Battle] Attack texture "${attackTexture}" not found`);
        }

        const animation = attackAnimation && this.anims.exists(attackAnimation)
            ? attackAnimation
            : idleAnimation;

        if (attackTexture && this.textures.exists(attackTexture)) {
            sprite.setTexture(attackTexture);
        }

        if (!this.anims.exists(animation)) {
            return this.wait(160);
        }

        const repeat = this.anims.get(animation)?.repeat ?? -1;
        sprite.play(animation, true);

        if (repeat === -1) {
            return this.wait(240);
        }

        return new Promise<void>((resolve) => {
            sprite.once('animationcomplete', () => {
                if (this.anims.exists(idleAnimation)) {
                    sprite.play(idleAnimation, true);
                }
                resolve();
            });
        });
    }

    private applyDamageToEnemy(enemy: Enemy, damage: number): number
    {
        const countBefore = enemy.count ?? 1;
        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemy.unitHp && enemy.unitHp > 0)
        {
            const newCount = Math.max(0, Math.ceil(enemy.hp / enemy.unitHp));
            enemy.count = newCount;
            if (enemy.unitDamage !== undefined)
            {
                enemy.damage = newCount * enemy.unitDamage;
            }
        }
        return countBefore - (enemy.count ?? 1);
    }

    private wait(duration: number)
    {
        return new Promise<void>((resolve) => {
            this.time.delayedCall(duration, () => resolve());
        });
    }

    private finishBattle(battleResult: BattleResult)
    {
        this.state = 'done';
        this.refreshFinger();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Exploration', {
                session: this.session,
                battleResult,
                startPosition: battleResult.won ? this.session.preBattlePosition : undefined
            });
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
        this.getBattleParty().forEach((hero, index) => {
            const line = this.partyHpLines[index];
            if (!line) return;
            line.setText(this.heroHpText(hero));
            const isActive = this.state === 'choosing-action' && index === this.currentHeroTurnIndex;
            if (hero.hp <= 0)
            {
                line.setColor('#888888');
            }
            else if (isActive)
            {
                line.setColor('#fff100');
            }
            else
            {
                line.setColor('#ffffff');
            }
        });
    }

    private refreshBattleParty()
    {
        this.heroSprites.forEach((sprite) => {
            sprite.destroy();
        });
        this.heroSprites = [];
        this.partyHpPanel.destroy();
        this.partyHpLines = [];
        this.currentHeroTurnIndex = 0;
        this.createHeroSprites();
        this.createPartyHpPanel();
        this.refreshCommandWindow();
        this.refreshPartyHp();
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

    private getBattleParty(): Hero[]
    {
        const party = this.getParty();
        return BATTLE_HERO_ORDER
            .map((key) => party.find((h) => h.key === key))
            .filter((h): h is Hero => h !== undefined);
    }

    private getParty()
    {
        return Object.values(this.session.heroes).filter((hero) => hero.recruited);
    }
}
