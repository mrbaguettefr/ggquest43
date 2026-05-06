import { Scene } from 'phaser';
import { createGameSession } from '../gameSession.ts';
import { splitSecret } from '../secret.ts';
import { SHARED_CONFIG, decryptConfigValue } from '../sharedConfig.ts';
import type { GameSession } from '../gameTypes.ts';

export class Seed extends Scene
{
    private promptText: Phaser.GameObjects.Text;
    private session: GameSession;
    private canContinue = false;

    constructor ()
    {
        super('Seed');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x1c2740);
        this.session = createGameSession();
        this.canContinue = false;

        this.promptText = this.add.text(512, 360, '', {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 820 }
        }).setOrigin(0.5);

        const seed = new URLSearchParams(window.location.search).get('seed');

        if (!seed)
        {
            this.promptText.setText([
                'Missing Seed Code',
                '',
                'A seed code is required to play.',
                'Add ?seed=YOUR-CODE to the URL.'
            ].join('\n'));
            return;
        }

        const seedUpper = seed.toUpperCase();
        const welcomeMessage = decryptConfigValue(SHARED_CONFIG.encrypted_welcome_message, seedUpper);
        const secretGift = decryptConfigValue(SHARED_CONFIG.encrypted_secret_gift, seedUpper);

        this.session.seedCode = seedUpper;
        this.session.welcomeMessage = welcomeMessage;
        this.session.secretGift = secretGift;
        this.session.secretFragments = splitSecret(secretGift);
        this.canContinue = true;
        this.promptText.setText(`${welcomeMessage}\n\nClick or press any key to continue.`);

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.input.keyboard.on('keydown', this.handleContinue, this);
        this.input.on('pointerdown', this.handleContinue, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleContinue, this);
            this.input.off('pointerdown', this.handleContinue, this);
        });
    }

    private handleContinue ()
    {
        if (this.canContinue)
        {
            this.scene.start('PlayerName', { session: this.session });
        }
    }
}
