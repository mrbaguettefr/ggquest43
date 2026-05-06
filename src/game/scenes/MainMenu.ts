import { Scene, GameObjects } from 'phaser';
import type { GameSession } from '../gameTypes.ts';

export class MainMenu extends Scene
{
    logo: GameObjects.Image;
    startItem: GameObjects.Text;
    creditsItem: GameObjects.Text;
    private session?: GameSession;

    constructor ()
    {
        super('MainMenu');
    }

    create (data: { session?: GameSession })
    {
        this.session = data.session;

        if (!this.session)
        {
            this.scene.start('Seed');
            return;
        }

        this.cameras.main.setBackgroundColor('#000000');

        this.logo = this.add.image(512, 245, 'main-menu-logo');
        this.logo.setDisplaySize(300, 300);

        this.startItem = this.createMenuItem(512, 475, 'Start Game', () => {
            this.scene.start('PlayerName', { session: this.session });
        });

        this.creditsItem = this.createMenuItem(512, 545, 'Credits', () => {
            this.scene.start('Credits', { session: this.session });
        });
    }

    private createMenuItem (x: number, y: number, label: string, onSelect: () => void)
    {
        const item = this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: 34,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        item.setInteractive({ useHandCursor: true });
        item.on('pointerover', () => {
            item.setColor('#f5d56a');
        });
        item.on('pointerout', () => {
            item.setColor('#ffffff');
        });
        item.on('pointerdown', onSelect);

        return item;
    }
}
