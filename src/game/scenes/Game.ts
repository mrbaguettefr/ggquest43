import { Math as PhaserMath, Scene } from 'phaser';
import { CARD_COLORS, CARD_LABELS, CARD_ORDER, FORCED_NAME, INITIAL_SEED_TEXT, INTERACT_DISTANCE, PLAYER_SPEED, WORLD_HEIGHT, WORLD_WIDTH } from '../gameConstants.ts';
import { AREAS } from '../encounters.ts';
import { createInitialHeroes } from '../heroes.ts';
import { splitSecret } from '../secret.ts';
import { SHARED_CONFIG, decryptConfigValue } from '../sharedConfig.ts';
import type { Area, CardColor, Encounter, GamePhase, Hero, HeroKey } from '../gameTypes.ts';

export class Game extends Scene
{
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private player: Phaser.GameObjects.Rectangle;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private phase: GamePhase = 'seed';
    private previousPhase: GamePhase = 'seed';
    private seedInput = INITIAL_SEED_TEXT;
    private nameInput = '';
    private welcomeMessage = '';
    private secretGift = '';
    private secretFragments: string[] = [];
    private currentLocation = 'Center of the World';
    private currentArea: Area | undefined;
    private currentEncounter: Encounter | undefined;
    private selectedTargetIndex = 0;
    private revealedCards = new Set<CardColor>();
    private pendingCards = new Set<CardColor>();
    private defeatedEncounters = new Set<string>();
    private messageAfterClose: (() => void) | undefined;
    private messageTitle = '';
    private messageBody = '';
    private infoText: Phaser.GameObjects.Text;
    private promptText: Phaser.GameObjects.Text;
    private partyText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;
    private interactionText: Phaser.GameObjects.Text;
    private battleLayer: Phaser.GameObjects.Container;
    private worldLayer: Phaser.GameObjects.Container;
    private heroes: Record<HeroKey, Hero> = createInitialHeroes();

    constructor ()
    {
        super('Game');
    }

    create ()
    {
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
        this.createBattleLayer();
        this.registerInput();
        this.enterSeedPrompt();
    }

    update (_time: number, delta: number)
    {
        if (this.phase !== 'explore')
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
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40);
    }

    private createBattleLayer ()
    {
        this.battleLayer = this.add.container(0, 0);
        this.battleLayer.setScrollFactor(0);
        this.battleLayer.setDepth(30);
        this.battleLayer.setVisible(false);
    }

    private registerInput ()
    {
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.phase === 'seed')
            {
                this.handleSeedKey(event);
            }
            else if (this.phase === 'welcome')
            {
                this.enterNamePrompt();
            }
            else if (this.phase === 'name')
            {
                this.handleNameKey(event);
            }
            else if (this.phase === 'explore' && (event.key === 'e' || event.key === 'E' || event.key === ' '))
            {
                this.interact();
            }
            else if (this.phase === 'battle')
            {
                this.handleBattleKey(event);
            }
            else if ((this.phase === 'message' || this.phase === 'complete') && (event.key === 'Enter' || event.key === ' '))
            {
                this.closeMessage();
            }
        });

        this.input.on('pointerdown', () => {
            if (this.phase === 'welcome')
            {
                this.enterNamePrompt();
            }
            else if (this.phase === 'explore')
            {
                this.interact();
            }
            else if (this.phase === 'message' || this.phase === 'complete')
            {
                this.closeMessage();
            }
            else if (this.phase === 'battle')
            {
                this.resolveHeroTurn();
            }
        });
    }

    private enterSeedPrompt ()
    {
        this.phase = 'seed';
        this.seedInput = INITIAL_SEED_TEXT;
        this.promptText.setVisible(true);
        this.updateSeedPrompt('');
        this.updateHud();
    }

    private handleSeedKey (event: KeyboardEvent)
    {
        if (event.key === 'Backspace')
        {
            this.seedInput = this.seedInput.slice(0, -1);
        }
        else if (event.key === 'Enter')
        {
            this.submitSeed();
            return;
        }
        else if (/^[a-zA-Z0-9-]$/.test(event.key))
        {
            this.seedInput += event.key.toUpperCase();
        }

        this.updateSeedPrompt('');
    }

    private updateSeedPrompt (errorMessage: string)
    {
        const input = this.seedInput.length > 0 ? this.seedInput : '_';
        const error = errorMessage.length > 0 ? `\n\n${errorMessage}` : '';

        this.promptText.setText([
            'Seed Game Code Required',
            'The code must be correct or the quest gets weird.',
            '',
            `[ ${input} ]`,
            '',
            'Type the seed and press Enter.'
        ].join('\n') + error);
    }

    private submitSeed ()
    {
        const welcomeMessage = decryptConfigValue(SHARED_CONFIG.encrypted_welcome_message, this.seedInput);
        const secretGift = decryptConfigValue(SHARED_CONFIG.encrypted_secret_gift, this.seedInput);

        this.welcomeMessage = welcomeMessage;
        this.secretGift = secretGift;
        this.secretFragments = splitSecret(secretGift);
        this.phase = 'welcome';
        this.promptText.setText(`${this.welcomeMessage}\n\nClick or press any key to continue.`);
    }

    private enterNamePrompt ()
    {
        this.phase = 'name';
        this.nameInput = '';
        this.updateNamePrompt();
    }

    private handleNameKey (event: KeyboardEvent)
    {
        if (event.key === 'Backspace')
        {
            this.nameInput = this.nameInput.slice(0, -1);
        }
        else if (event.key === 'Enter')
        {
            this.startExploration();
            return;
        }
        else if (event.key.length === 1 && this.nameInput.length < FORCED_NAME.length)
        {
            this.nameInput += FORCED_NAME[this.nameInput.length];
        }

        this.updateNamePrompt();
    }

    private updateNamePrompt ()
    {
        const input = this.nameInput.length > 0 ? this.nameInput : '_';

        this.promptText.setText([
            'Enter your name',
            '',
            `[ ${input} ]`,
            '',
            'Type anything. The game has opinions.',
            'Press Enter to confirm.'
        ].join('\n'));
    }

    private startExploration ()
    {
        this.phase = 'explore';
        this.promptText.setVisible(false);
        this.player.setPosition(470, 610);
        this.camera.startFollow(this.player, true, 0.08, 0.08);
        this.statusText.setText('Welcome, GGLeBoss. Arrow keys move. Press E near gates, heroes, and the wall.');
        this.updateHud();
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
        const encounter = area.encounters.find((candidate) => !this.defeatedEncounters.has(this.getEncounterId(area, candidate)));

        if (!encounter)
        {
            this.showMessage(area.name, 'This area is cleared. baguettefr gives it a tiny, approving nod.');
            return;
        }

        this.currentArea = area;
        this.currentEncounter = this.cloneEncounter(encounter);
        this.currentLocation = area.name;
        this.startBattle();
    }

    private startBattle ()
    {
        if (!this.currentArea || !this.currentEncounter)
        {
            return;
        }

        this.phase = 'battle';
        this.selectedTargetIndex = 0;
        const battleHint = this.getBattleStartHint();
        this.statusText.setText([
            battleHint,
            'Choose a target with Up/Down, then click or press Enter to attack.'
        ].filter(Boolean).join('\n'));
        this.renderBattle();
    }

    private handleBattleKey (event: KeyboardEvent)
    {
        if (!this.currentEncounter)
        {
            return;
        }

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
        if (!this.currentArea || !this.currentEncounter)
        {
            return;
        }

        const liveEnemies = this.currentEncounter.enemies.filter((enemy) => enemy.hp > 0);

        if (liveEnemies.length === 0)
        {
            return;
        }

        this.selectedTargetIndex = PhaserMath.Clamp(this.selectedTargetIndex, 0, this.currentEncounter.enemies.length - 1);

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

        if (this.currentEncounter.enemies.every((enemy) => enemy.hp <= 0))
        {
            this.winBattle(log);
            return;
        }

        if (this.currentArea.key === 'dungeon' && !this.heroes.knight.recruited)
        {
            log.push('Fear erupts. The party flees back to the wall.');
            this.loseBattle(log.join('\n'));
            return;
        }

        for (const enemy of this.currentEncounter.enemies.filter((candidate) => candidate.hp > 0))
        {
            const target = this.getParty().find((hero) => hero.hp > 0);

            if (!target)
            {
                break;
            }

            target.hp = Math.max(0, target.hp - enemy.damage);
            log.push(`${enemy.name} hits ${target.name} for ${enemy.damage}.`);
        }

        if (this.getParty().every((hero) => hero.hp <= 0))
        {
            this.loseBattle(log.join('\n'));
            return;
        }

        this.statusText.setText(log.join('\n'));
        this.renderBattle();
    }

    private winBattle (log: string[])
    {
        if (!this.currentArea || !this.currentEncounter)
        {
            return;
        }

        const encounter = this.currentEncounter;
        const area = this.currentArea;
        this.defeatedEncounters.add(this.getEncounterId(area, encounter));

        if (encounter.card)
        {
            this.pendingCards.add(encounter.card);
        }

        if (encounter.unlockHero)
        {
            this.heroes[encounter.unlockHero].unlocked = true;
        }

        this.battleLayer.setVisible(false);
        this.phase = 'explore';
        this.currentLocation = area.name;
        this.player.setPosition(area.gateX, 590);
        this.statusText.setText(log.concat([
            `${encounter.name} defeated.`,
            encounter.card ? `${CARD_LABELS[encounter.card]} acquired. Walk back to the wall and press E.` : 'The road ahead opens.'
        ]).join('\n'));
        this.currentEncounter = undefined;
        this.updateHud();
    }

    private loseBattle (reason: string)
    {
        this.restoreParty();
        this.battleLayer.setVisible(false);
        this.phase = 'explore';
        this.currentLocation = 'Center of the World';
        this.player.setPosition(470, 610);
        this.statusText.setText(`${reason}\nResurrected at the Card Reader wall with full HP.`);
        this.currentEncounter = undefined;
        this.updateHud();
    }

    private insertPendingCard ()
    {
        const card = CARD_ORDER.find((candidate) => this.pendingCards.has(candidate) && !this.revealedCards.has(candidate));

        if (!card)
        {
            this.showMessage('Card Reader Wall', this.buildWallMessage());
            return;
        }

        const index = CARD_ORDER.indexOf(card);
        this.revealedCards.add(card);
        this.pendingCards.delete(card);
        this.restoreParty();

        const lines = [
            `${CARD_LABELS[card]} inserted.`,
            `Fragment ${index + 1}: ${this.secretFragments[index]}`
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
            lines.push(`Full secret_gift: ${this.secretGift}`);
        }

        this.showMessage('Card Reader Online', lines.join('\n'), () => {
            if (this.revealedCards.size === 3)
            {
                this.phase = 'complete';
                this.showMessage('Quest Complete', `The full secret_gift is:\n${this.secretGift}\n\nbaguettefr pretends this was planned all along.`);
            }
        });
    }

    private recruitHero (heroKey: HeroKey)
    {
        const hero = this.heroes[heroKey];
        hero.recruited = true;
        hero.hp = hero.maxHp;
        this.showMessage(`${hero.name} Recruited`, `${hero.name} joins the party.\nSpecial: ${hero.special}`);
        this.updateHud();
    }

    private showMessage (title: string, body: string, afterClose?: () => void)
    {
        this.previousPhase = this.phase;
        this.phase = 'message';
        this.messageTitle = title;
        this.messageBody = body;
        this.messageAfterClose = afterClose;
        this.promptText.setVisible(true);
        this.promptText.setText(`${title}\n\n${body}\n\nClick or press Enter.`);
    }

    private closeMessage ()
    {
        this.promptText.setVisible(false);
        const afterClose = this.messageAfterClose;
        this.messageAfterClose = undefined;

        if (this.phase !== 'complete')
        {
            this.phase = this.previousPhase === 'battle' ? 'explore' : this.previousPhase;
        }

        if (afterClose)
        {
            afterClose();
        }
    }

    private renderBattle ()
    {
        if (!this.currentArea || !this.currentEncounter)
        {
            return;
        }

        this.battleLayer.removeAll(true);
        this.battleLayer.setVisible(true);
        this.ensureSelectedLiveTarget();

        this.battleLayer.add(this.add.rectangle(512, 384, 1024, 768, this.currentArea.color));
        this.battleLayer.add(this.add.rectangle(512, 444, 860, 360, 0x1c2334, 0.55).setStrokeStyle(3, 0xffffff, 0.4));
        this.battleLayer.add(this.add.text(512, 70, this.currentEncounter.name, {
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

        this.currentEncounter.enemies.forEach((enemy, index) => {
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
                interaction = `Press E: recruit ${this.heroes[recruitable].name}`;
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
        this.infoText.setText(`Location: ${this.currentLocation}`);
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

        if (leonNear && this.heroes.leon.unlocked && !this.heroes.leon.recruited)
        {
            return 'leon';
        }

        if (knightNear && this.heroes.knight.unlocked && !this.heroes.knight.recruited)
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
            return this.revealedCards.has(card) ? `${CARD_LABELS[card]}: ${this.secretFragments[index]}` : `${CARD_LABELS[card]}: ?????`;
        });

        return fragments.join('\n');
    }

    private getParty ()
    {
        return Object.values(this.heroes).filter((hero) => hero.recruited);
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

    private getSelectedLiveEnemy ()
    {
        if (!this.currentEncounter)
        {
            return undefined;
        }

        this.ensureSelectedLiveTarget();
        const selected = this.currentEncounter.enemies[this.selectedTargetIndex];

        if (selected && selected.hp > 0)
        {
            return selected;
        }

        return this.currentEncounter.enemies.find((enemy) => enemy.hp > 0);
    }

    private moveSelectedTarget (direction: -1 | 1)
    {
        if (!this.currentEncounter)
        {
            return;
        }

        const enemies = this.currentEncounter.enemies;
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
        if (!this.currentEncounter)
        {
            return;
        }

        const selected = this.currentEncounter.enemies[this.selectedTargetIndex];

        if (selected && selected.hp > 0)
        {
            return;
        }

        const nextLiveIndex = this.currentEncounter.enemies.findIndex((enemy) => enemy.hp > 0);

        if (nextLiveIndex >= 0)
        {
            this.selectedTargetIndex = nextLiveIndex;
        }
    }

    private getBattleStartHint ()
    {
        if (!this.currentArea || !this.currentEncounter)
        {
            return '';
        }

        const hasFlyingEnemy = this.currentEncounter.enemies.some((enemy) => enemy.flying);
        const hasRangedHero = this.getParty().some((hero) => hero.range === 'ranged');

        if (hasFlyingEnemy && !hasRangedHero)
        {
            return 'Cloud: They are flying. My mom did not teach me that.';
        }

        if (this.currentArea.key === 'dungeon' && !this.heroes.knight.recruited)
        {
            return 'Cloud: This place is screaming inside my helmet. That feels like a bad sign.';
        }

        return '';
    }
}
