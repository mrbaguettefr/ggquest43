import { Scene } from 'phaser';
import { FORCED_NAME } from '../gameConstants.ts';
import type { GameSession } from '../gameTypes.ts';

export class PlayerName extends Scene
{
    private nameInput = '';
    private needsExactName = false;
    private promptText: Phaser.GameObjects.Text;
    private session: GameSession;

    constructor ()
    {
        super('PlayerName');
    }

    create (data: { session: GameSession })
    {
        this.cameras.main.setBackgroundColor(0x1c2740);
        this.session = data.session;
        this.nameInput = '';
        this.needsExactName = false;

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

        this.updateNamePrompt();
        this.input.keyboard.on('keydown', this.handleKey, this);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey, this);
        });
    }

    private handleKey (event: KeyboardEvent)
    {
        if (event.key === 'Backspace')
        {
            this.nameInput = this.nameInput.slice(0, -1);
            this.needsExactName = false;
        }
        else if (event.key === 'Enter')
        {
            if (this.nameInput !== FORCED_NAME)
            {
                this.needsExactName = true;
                this.updateNamePrompt();
                return;
            }

            this.session.playerName = this.nameInput;
            this.scene.start('Exploration', { session: this.session });
            return;
        }
        else if (event.key.length === 1 && this.nameInput.length < FORCED_NAME.length)
        {
            this.nameInput += FORCED_NAME[this.nameInput.length];
            this.needsExactName = false;
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
            'Press Enter to confirm.',
            this.needsExactName ? `The box must say ${FORCED_NAME} first.` : ''
        ].join('\n'));
    }
}
