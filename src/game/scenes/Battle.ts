import { Math as PhaserMath, Scene } from 'phaser';
import type { Area, BattleResult, Encounter, GameSession } from '../gameTypes.ts';

export class Battle extends Scene
{
    private selectedTargetIndex = 0;
    private battleLayer: Phaser.GameObjects.Container;
    private statusText: Phaser.GameObjects.Text;
    private partyText: Phaser.GameObjects.Text;
    private session: GameSession;
    private area: Area;
    private encounter: Encounter;

    constructor ()
    {
        super('Battle');
    }

    create (data: { session: GameSession })
    {
        this.session = data.session;

        if (!this.session.currentArea || !this.session.currentEncounter)
        {
            this.scene.start('Exploration', { session: this.session });
            return;
        }

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.area = this.session.currentArea;
        this.encounter = this.session.currentEncounter;
        this.selectedTargetIndex = 0;
        this.cameras.main.setBackgroundColor(this.area.color);
        this.createHud();
        this.createBattleLayer();
        this.registerInput();
        this.statusText.setText([
            this.getBattleStartHint(),
            'Choose a target with Up/Down, then click or press Enter to attack.'
        ].filter(Boolean).join('\n'));
        this.renderBattle();
    }

    private createHud ()
    {
        this.partyText = this.add.text(16, 84, '', {
            fontFamily: 'Courier New',
            fontSize: 16,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(20);

        this.statusText = this.add.text(512, 712, '', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#fff6c4',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40);
    }

    private createBattleLayer ()
    {
        this.battleLayer = this.add.container(0, 0);
        this.battleLayer.setDepth(30);
    }

    private registerInput ()
    {
        this.input.keyboard?.on('keydown', this.handleKey, this);
        this.input.on('pointerdown', this.resolveHeroTurn, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey, this);
            this.input.off('pointerdown', this.resolveHeroTurn, this);
        });
    }

    private handleKey (event: KeyboardEvent)
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
            this.resolveHeroTurn();
        }
    }

    private resolveHeroTurn ()
    {
        const liveEnemies = this.encounter.enemies.filter((enemy) => enemy.hp > 0);

        if (liveEnemies.length === 0)
        {
            return;
        }

        this.selectedTargetIndex = PhaserMath.Clamp(this.selectedTargetIndex, 0, this.encounter.enemies.length - 1);
        const log: string[] = [];

        for (const hero of this.getParty())
        {
            const target = this.getSelectedLiveEnemy();

            if (!target)
            {
                break;
            }

            if (target.flying && hero.range !== 'ranged')
            {
                log.push(`${hero.name} swings under ${target.name}.`);
                continue;
            }

            const damage = hero.key === 'cloud' && target.boss ? hero.damage + 8 : hero.damage;
            target.hp = Math.max(0, target.hp - damage);
            log.push(`${hero.name} uses ${hero.special} for ${damage}.`);
        }

        if (this.encounter.enemies.every((enemy) => enemy.hp <= 0))
        {
            this.finishBattle({ won: true, area: this.area, encounter: this.encounter, log });
            return;
        }

        if (this.area.key === 'dungeon' && !this.session.heroes.knight.recruited)
        {
            log.push('Fear erupts. The party flees back to the wall.');
            this.finishBattle({ won: false, area: this.area, encounter: this.encounter, log });
            return;
        }

        for (const enemy of this.encounter.enemies.filter((candidate) => candidate.hp > 0))
        {
            const liveHeroes = this.getParty().filter((hero) => hero.hp > 0);

            if (liveHeroes.length === 0)
            {
                break;
            }

            const target = liveHeroes[Math.floor(Math.random() * liveHeroes.length)];
            target.hp = Math.max(0, target.hp - enemy.damage);
            log.push(`${enemy.name} hits ${target.name} for ${enemy.damage}.`);
        }

        if (this.getParty().every((hero) => hero.hp <= 0))
        {
            this.finishBattle({ won: false, area: this.area, encounter: this.encounter, log });
            return;
        }

        this.statusText.setText(log.join('\n'));
        this.renderBattle();
    }

    private finishBattle (battleResult: BattleResult)
    {
        this.scene.start('Exploration', { session: this.session, battleResult });
    }

    private renderBattle ()
    {
        this.battleLayer.removeAll(true);
        this.ensureSelectedLiveTarget();

        this.battleLayer.add(this.add.rectangle(512, 384, 1024, 768, this.area.color));
        this.battleLayer.add(this.add.rectangle(512, 444, 860, 360, 0x1c2334, 0.55).setStrokeStyle(3, 0xffffff, 0.4));
        this.battleLayer.add(this.add.text(512, 70, this.encounter.name, {
            fontFamily: 'Arial Black',
            fontSize: 34,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 7
        }).setOrigin(0.5));

        this.getParty().forEach((hero, index) => {
            const y = 250 + index * 100;
            const unit = this.add.rectangle(250, y, 70, 70, 0xf5f1d8);
            unit.setStrokeStyle(4, 0x0d1826);
            this.battleLayer.add(unit);
            this.battleLayer.add(this.add.text(250, y + 54, `${hero.name}\nHP ${hero.hp}/${hero.maxHp}`, {
                fontFamily: 'Arial',
                fontSize: 15,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5));
        });

        this.encounter.enemies.forEach((enemy, index) => {
            const y = 230 + index * 120;
            const isSelected = index === this.selectedTargetIndex;
            const fill = enemy.boss ? 0x7d2121 : 0x5b2f7f;
            const unit = this.add.rectangle(750, y, enemy.boss ? 110 : 78, enemy.boss ? 92 : 72, fill);
            unit.setStrokeStyle(isSelected && enemy.hp > 0 ? 6 : 3, isSelected && enemy.hp > 0 ? 0xfff1a0 : 0x12091a);
            unit.setInteractive({ useHandCursor: true });
            unit.on('pointerdown', () => {
                this.selectedTargetIndex = index;
                this.resolveHeroTurn();
            });
            this.battleLayer.add(unit);

            if (isSelected && enemy.hp > 0)
            {
                this.addTargetFinger(enemy.boss ? 664 : 680, y);
            }

            this.battleLayer.add(this.add.text(750, y + 64, [
                enemy.name,
                `HP ${enemy.hp}/${enemy.maxHp}`,
                enemy.flying ? 'Flying' : ''
            ].filter(Boolean).join('\n'), {
                fontFamily: 'Arial',
                fontSize: 15,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5));
        });

        this.updateHud();
    }

    private addTargetFinger (x: number, y: number)
    {
        const finger = this.add.container(x, y);
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
        this.battleLayer.add(finger);
    }

    private updateHud ()
    {
        this.partyText.setText([
            'Party:',
            ...this.getParty().map((hero) => `${hero.name.padEnd(7)} HP ${String(hero.hp).padStart(3)} / ${hero.maxHp}`)
        ].join('\n'));
    }

    private getParty ()
    {
        return Object.values(this.session.heroes).filter((hero) => hero.recruited);
    }

    private getSelectedLiveEnemy ()
    {
        this.ensureSelectedLiveTarget();
        const selected = this.encounter.enemies[this.selectedTargetIndex];

        if (selected && selected.hp > 0)
        {
            return selected;
        }

        return this.encounter.enemies.find((enemy) => enemy.hp > 0);
    }

    private moveSelectedTarget (direction: -1 | 1)
    {
        const enemies = this.encounter.enemies;
        const liveEnemies = enemies.filter((enemy) => enemy.hp > 0);

        if (liveEnemies.length === 0)
        {
            return;
        }

        let nextIndex = this.selectedTargetIndex;

        for (let steps = 0; steps < enemies.length; steps += 1)
        {
            nextIndex = PhaserMath.Wrap(nextIndex + direction, 0, enemies.length);

            if (enemies[nextIndex].hp > 0)
            {
                this.selectedTargetIndex = nextIndex;
                this.renderBattle();
                return;
            }
        }
    }

    private ensureSelectedLiveTarget ()
    {
        const selected = this.encounter.enemies[this.selectedTargetIndex];

        if (selected && selected.hp > 0)
        {
            return;
        }

        const nextLiveIndex = this.encounter.enemies.findIndex((enemy) => enemy.hp > 0);

        if (nextLiveIndex >= 0)
        {
            this.selectedTargetIndex = nextLiveIndex;
        }
    }

    private getBattleStartHint ()
    {
        const hasFlyingEnemy = this.encounter.enemies.some((enemy) => enemy.flying);
        const hasRangedHero = this.getParty().some((hero) => hero.range === 'ranged');

        if (hasFlyingEnemy && !hasRangedHero)
        {
            return 'Cloud: They are flying. My mom did not teach me that.';
        }

        if (this.area.key === 'dungeon' && !this.session.heroes.knight.recruited)
        {
            return 'Cloud: This place is screaming inside my helmet. That feels like a bad sign.';
        }

        return '';
    }
}
