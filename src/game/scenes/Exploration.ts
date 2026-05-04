import { Math as PhaserMath, Scene } from 'phaser';
import { AREAS } from '../encounters.ts';
import { CARD_COLORS, CARD_LABELS, CARD_ORDER, INTERACT_DISTANCE, PLAYER_SPEED, WORLD_HEIGHT, WORLD_WIDTH } from '../gameConstants.ts';
import type { Area, BattleResult, Encounter, GameSession, HeroKey } from '../gameTypes.ts';

export class Exploration extends Scene
{
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private player: Phaser.GameObjects.Rectangle;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private infoText: Phaser.GameObjects.Text;
    private partyText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;
    private interactionText: Phaser.GameObjects.Text;
    private promptText: Phaser.GameObjects.Text;
    private worldLayer: Phaser.GameObjects.Container;
    private session: GameSession;
    private messageAfterClose: (() => void) | undefined;
    private inputLocked = false;

    constructor ()
    {
        super('Exploration');
    }

    create (data: { session: GameSession; battleResult?: BattleResult })
    {
        this.session = data.session;
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x1c2740);
        this.camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        this.createWorld();
        this.createHud();
        this.registerInput();
        this.applyBattleResult(data.battleResult);
    }

    update (_time: number, delta: number)
    {
        if (this.inputLocked)
        {
            return;
        }

        const distance = PLAYER_SPEED * (delta / 1000);
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown)
        {
            velocityX = -1;
        }
        else if (this.cursors.right.isDown)
        {
            velocityX = 1;
        }

        if (this.cursors.up.isDown)
        {
            velocityY = -1;
        }
        else if (this.cursors.down.isDown)
        {
            velocityY = 1;
        }

        if (velocityX !== 0 && velocityY !== 0)
        {
            velocityX *= 0.7;
            velocityY *= 0.7;
        }

        this.player.x = PhaserMath.Clamp(this.player.x + velocityX * distance, 80, WORLD_WIDTH - 80);
        this.player.y = PhaserMath.Clamp(this.player.y + velocityY * distance, 120, WORLD_HEIGHT - 80);
        this.updateExploreText();
    }

    private createWorld ()
    {
        this.worldLayer = this.add.container(0, 0);

        this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x25364e);
        this.add.rectangle(WORLD_WIDTH / 2, 725, WORLD_WIDTH, 390, 0x2f6e55);

        this.drawHub();
        AREAS.forEach((area) => this.drawAreaGate(area));

        this.player = this.add.rectangle(470, 610, 34, 42, 0xf5f1d8);
        this.player.setStrokeStyle(4, 0x102030);
        this.worldLayer.add(this.player);

        this.camera.startFollow(this.player, true, 0.08, 0.08);
    }

    private drawHub ()
    {
        const wall = this.add.rectangle(460, 360, 260, 170, 0x394259);
        wall.setStrokeStyle(5, 0x0f1724);
        this.worldLayer.add(wall);

        this.worldLayer.add(this.add.text(348, 270, 'CARD READER WALL', {
            fontFamily: 'Arial Black',
            fontSize: 18,
            color: '#f7f2d7'
        }));

        CARD_ORDER.forEach((card, index) => {
            const slot = this.add.rectangle(376 + index * 84, 360, 54, 88, CARD_COLORS[card], 0.4);
            slot.setStrokeStyle(4, CARD_COLORS[card]);
            this.worldLayer.add(slot);
        });

        this.worldLayer.add(this.add.text(305, 500, 'baguettefr: "Bring cards. Receive suspicious wisdom."', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }));
    }

    private drawAreaGate (area: Area)
    {
        const gate = this.add.rectangle(area.gateX, area.gateY, 230, 150, area.color);
        gate.setStrokeStyle(5, 0x101522);
        this.worldLayer.add(gate);

        this.worldLayer.add(this.add.text(area.gateX, area.gateY - 20, area.name, {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5));

        this.worldLayer.add(this.add.text(area.gateX, area.gateY + 36, `Reward: ${CARD_LABELS[area.card]}`, {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#fff4b8',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5));
    }

    private createHud ()
    {
        this.infoText = this.add.text(16, 14, '', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(20);

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

        this.interactionText = this.add.text(512, 650, '', {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: 880 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

        this.promptText = this.add.text(512, 360, '', {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 820 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setVisible(false);
    }

    private registerInput ()
    {
        this.input.keyboard?.on('keydown', this.handleKey, this);
        this.input.on('pointerdown', this.handlePointer, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey, this);
            this.input.off('pointerdown', this.handlePointer, this);
        });
    }

    private handleKey (event: KeyboardEvent)
    {
        if (this.inputLocked && (event.key === 'Enter' || event.key === ' '))
        {
            this.closeMessage();
            return;
        }

        if (!this.inputLocked && (event.key === 'e' || event.key === 'E' || event.key === ' '))
        {
            this.interact();
        }
    }

    private handlePointer ()
    {
        if (this.inputLocked)
        {
            this.closeMessage();
        }
        else
        {
            this.interact();
        }
    }

    private applyBattleResult (battleResult: BattleResult | undefined)
    {
        if (!battleResult)
        {
            this.session.currentLocation = 'Center of the World';
            this.player.setPosition(470, 610);
            this.statusText.setText(`Welcome, ${this.session.playerName}. Arrow keys move. Press E near gates, heroes, and the wall.`);
            this.updateHud();
            return;
        }

        this.session.currentEncounter = undefined;

        if (battleResult.won)
        {
            this.winBattle(battleResult);
        }
        else
        {
            this.loseBattle(battleResult.log.join('\n'));
        }
    }

    private interact ()
    {
        const recruitableHero = this.getNearbyRecruitableHero();

        if (recruitableHero)
        {
            this.recruitHero(recruitableHero);
            return;
        }

        if (this.isNearHubWall())
        {
            this.insertPendingCard();
            return;
        }

        const area = this.getNearbyArea();

        if (area)
        {
            this.enterArea(area);
        }
    }

    private enterArea (area: Area)
    {
        const encounter = area.encounters.find((candidate) => !this.session.defeatedEncounters.has(this.getEncounterId(area, candidate)));

        if (!encounter)
        {
            this.showMessage(area.name, 'This area is cleared. baguettefr gives it a tiny, approving nod.');
            return;
        }

        this.session.currentArea = area;
        this.session.currentEncounter = this.cloneEncounter(encounter);
        this.session.currentLocation = area.name;
        this.scene.start('Battle', { session: this.session });
    }

    private winBattle (battleResult: BattleResult)
    {
        const { area, encounter, log } = battleResult;
        this.session.defeatedEncounters.add(this.getEncounterId(area, encounter));

        if (encounter.card)
        {
            this.session.pendingCards.add(encounter.card);
        }

        if (encounter.unlockHero)
        {
            this.session.heroes[encounter.unlockHero].unlocked = true;
        }

        this.session.currentLocation = area.name;
        this.player.setPosition(area.gateX, 590);
        this.statusText.setText(log.concat([
            `${encounter.name} defeated.`,
            encounter.card ? `${CARD_LABELS[encounter.card]} acquired. Walk back to the wall and press E.` : 'The road ahead opens.'
        ]).join('\n'));
        this.updateHud();
    }

    private loseBattle (reason: string)
    {
        this.restoreParty();
        this.session.currentLocation = 'Center of the World';
        this.player.setPosition(470, 610);
        this.statusText.setText(`${reason}\nResurrected at the Card Reader wall with full HP.`);
        this.updateHud();
    }

    private insertPendingCard ()
    {
        const card = CARD_ORDER.find((candidate) => this.session.pendingCards.has(candidate) && !this.session.revealedCards.has(candidate));

        if (!card)
        {
            this.showMessage('Card Reader Wall', this.buildWallMessage());
            return;
        }

        const index = CARD_ORDER.indexOf(card);
        this.session.revealedCards.add(card);
        this.session.pendingCards.delete(card);
        this.restoreParty();

        const lines = [
            `${CARD_LABELS[card]} inserted.`,
            `Fragment ${index + 1}: ${this.session.secretFragments[index]}`
        ];

        if (card === 'green')
        {
            lines.push('Leon appears near the wall, looking extremely serious about a silly problem.');
        }
        else if (card === 'blue')
        {
            lines.push('Knight appears near the wall and immediately makes everyone uncomfortable.');
        }
        else
        {
            lines.push(`Full secret_gift: ${this.session.secretGift}`);
        }

        this.showMessage('Card Reader Online', lines.join('\n'), () => {
            if (this.session.revealedCards.size === 3)
            {
                this.showMessage('Quest Complete', `The full secret_gift is:\n${this.session.secretGift}\n\nbaguettefr pretends this was planned all along.\n\nThe credits are legally obligated to begin next.`, () => {
                    this.scene.start('Credits');
                });
            }
        });
    }

    private recruitHero (heroKey: HeroKey)
    {
        const hero = this.session.heroes[heroKey];
        hero.recruited = true;
        hero.hp = hero.maxHp;
        this.showMessage(`${hero.name} Recruited`, `${hero.name} joins the party.\nSpecial: ${hero.special}`);
        this.updateHud();
    }

    private showMessage (title: string, body: string, afterClose?: () => void)
    {
        this.inputLocked = true;
        this.messageAfterClose = afterClose;
        this.promptText.setVisible(true);
        this.promptText.setText(`${title}\n\n${body}\n\nClick or press Enter.`);
    }

    private closeMessage ()
    {
        this.promptText.setVisible(false);
        this.inputLocked = false;
        const afterClose = this.messageAfterClose;
        this.messageAfterClose = undefined;

        if (afterClose)
        {
            afterClose();
        }
    }

    private updateExploreText ()
    {
        let interaction = '';

        if (this.isNearHubWall())
        {
            interaction = 'Press E: insert Card / inspect Card Reader wall';
        }
        else
        {
            const recruitable = this.getNearbyRecruitableHero();
            const area = this.getNearbyArea();

            if (recruitable)
            {
                interaction = `Press E: recruit ${this.session.heroes[recruitable].name}`;
            }
            else if (area)
            {
                interaction = `Press E: enter ${area.name}`;
            }
        }

        this.interactionText.setText(interaction);
        this.updateHud();
    }

    private updateHud ()
    {
        this.infoText.setText(`Location: ${this.session.currentLocation}`);
        this.partyText.setText([
            'Party:',
            ...this.getParty().map((hero) => `${hero.name.padEnd(7)} HP ${String(hero.hp).padStart(3)} / ${hero.maxHp}`)
        ].join('\n'));
    }

    private getNearbyArea ()
    {
        return AREAS.find((area) => PhaserMath.Distance.Between(this.player.x, this.player.y, area.gateX, area.gateY) <= INTERACT_DISTANCE);
    }

    private getNearbyRecruitableHero ()
    {
        const leonNear = PhaserMath.Distance.Between(this.player.x, this.player.y, 355, 620) <= INTERACT_DISTANCE;
        const knightNear = PhaserMath.Distance.Between(this.player.x, this.player.y, 575, 620) <= INTERACT_DISTANCE;

        if (leonNear && this.session.heroes.leon.unlocked && !this.session.heroes.leon.recruited)
        {
            return 'leon';
        }

        if (knightNear && this.session.heroes.knight.unlocked && !this.session.heroes.knight.recruited)
        {
            return 'knight';
        }

        return undefined;
    }

    private isNearHubWall ()
    {
        return PhaserMath.Distance.Between(this.player.x, this.player.y, 460, 400) <= 185;
    }

    private buildWallMessage ()
    {
        const fragments = CARD_ORDER.map((card, index) => {
            return this.session.revealedCards.has(card) ? `${CARD_LABELS[card]}: ${this.session.secretFragments[index]}` : `${CARD_LABELS[card]}: ?????`;
        });

        return fragments.join('\n');
    }

    private getParty ()
    {
        return Object.values(this.session.heroes).filter((hero) => hero.recruited);
    }

    private restoreParty ()
    {
        this.getParty().forEach((hero) => {
            hero.hp = hero.maxHp;
        });
    }

    private getEncounterId (area: Area, encounter: Encounter)
    {
        return `${area.key}:${encounter.name}`;
    }

    private cloneEncounter (encounter: Encounter): Encounter
    {
        return {
            ...encounter,
            enemies: encounter.enemies.map((enemy) => ({ ...enemy }))
        };
    }
}
