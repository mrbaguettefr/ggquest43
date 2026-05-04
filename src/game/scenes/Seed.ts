import { Scene } from 'phaser';
import { INITIAL_SEED_TEXT } from '../gameConstants.ts';
import { createGameSession } from '../gameSession.ts';
import { splitSecret } from '../secret.ts';
import { SHARED_CONFIG, decryptConfigValue } from '../sharedConfig.ts';
import type { GameSession } from '../gameTypes.ts';

export class Seed extends Scene
{
    private seedInput = INITIAL_SEED_TEXT;
    private promptText: Phaser.GameObjects.Text;
    private session: GameSession;
    private showingWelcome = false;

    constructor ()
    {
        super('Seed');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x1c2740);
        this.session = createGameSession();
        this.seedInput = INITIAL_SEED_TEXT;
        this.showingWelcome = false;

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.promptText = this.add.text(512, 360, '', {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 7,
            align: 'center',
            wordWrap: { width: 820 }
        }).setOrigin(0.5);

        this.updateSeedPrompt('');

        this.input.keyboard.on('keydown', this.handleKey, this);
        this.input.on('pointerdown', this.continueFromWelcome, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey, this);
            this.input.off('pointerdown', this.continueFromWelcome, this);
        });
    }

    private handleKey (event: KeyboardEvent)
    {
        if (this.showingWelcome)
        {
            this.continueFromWelcome();
            return;
        }

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

        this.session.seedCode = this.seedInput;
        this.session.welcomeMessage = welcomeMessage;
        this.session.secretGift = secretGift;
        this.session.secretFragments = splitSecret(secretGift);
        this.showingWelcome = true;
        this.promptText.setText(`${welcomeMessage}\n\nClick or press any key to continue.`);
    }

    private continueFromWelcome ()
    {
        if (this.showingWelcome)
        {
            this.scene.start('PlayerName', { session: this.session });
        }
    }
}
