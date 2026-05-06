import { Scene } from 'phaser';
import { createGameSession } from '../gameSession.ts';
import { splitSecret } from '../secret.ts';
import { SHARED_CONFIG, decryptConfigValue } from '../sharedConfig.ts';

export class Seed extends Scene {
    constructor() {
        super('Seed');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1c2740);

        const seed = new URLSearchParams(window.location.search).get('seed');

        if (!seed) {
            this.add
                .text(512, 360, [
                    'Missing Seed Code',
                    '',
                    'A seed code is required to play.',
                    'Add ?seed=YOUR-CODE to the URL.'
                ].join('\n'), {
                    fontFamily: 'Arial Black',
                    fontSize: 26,
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 7,
                    align: 'center',
                    wordWrap: { width: 820 }
                })
                .setOrigin(0.5);
            return;
        }

        const seedUpper = seed.toUpperCase();
        const secretGift = decryptConfigValue(
            SHARED_CONFIG.encrypted_secret_gift,
            seedUpper
        );
        const session = createGameSession();

        session.seedCode = seedUpper;
        session.secretGift = secretGift;
        session.secretFragments = splitSecret(secretGift);
        this.scene.start('MainMenu', { session });
    }
}
