import { Math as PhaserMath, Scene } from 'phaser';

const TILE_SIZE = 32;
const MAP_WIDTH = 140;
const MAP_HEIGHT = 24;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;
const PLAYER_SPEED = 280;
const CAMERA_ZOOM = 2;

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    player: Phaser.GameObjects.Image;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.createTileTexture();
        this.createPlayerTexture();
        this.createWorld();

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x6fb7ff);
        this.camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.camera.setZoom(CAMERA_ZOOM);

        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is unavailable.');
        }

        this.cursors = this.input.keyboard.createCursorKeys();

        this.player = this.add.image(160, WORLD_HEIGHT - 160, 'player-marker');
        this.player.setAngle(90);

        this.camera.startFollow(this.player, true, 0.08, 0.08);

        const helpText = this.add.text(16, 16, 'Arrow keys to scroll the scene', {
            fontFamily: 'Arial Black',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        });
        helpText.setScrollFactor(0);
    }

    update (_time: number, delta: number)
    {
        const distance = PLAYER_SPEED * (delta / 1000);
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown)
        {
            velocityX = -1;
            this.player.setAngle(-90);
        }
        else if (this.cursors.right.isDown)
        {
            velocityX = 1;
            this.player.setAngle(90);
        }

        if (this.cursors.up.isDown)
        {
            velocityY = -1;
            this.player.setAngle(0);
        }
        else if (this.cursors.down.isDown)
        {
            velocityY = 1;
            this.player.setAngle(180);
        }

        this.player.x = PhaserMath.Clamp(this.player.x + velocityX * distance, 0, WORLD_WIDTH);
        this.player.y = PhaserMath.Clamp(this.player.y + velocityY * distance, 0, WORLD_HEIGHT);
    }

    private createWorld ()
    {
        const map = this.make.tilemap({
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            width: MAP_WIDTH,
            height: MAP_HEIGHT
        });

        const tileset = map.addTilesetImage('scroll-tiles', 'scroll-tiles', TILE_SIZE, TILE_SIZE);

        if (!tileset)
        {
            throw new Error('Unable to create scroll tilemap tileset.');
        }

        const layer = map.createBlankLayer('World', tileset, 0, 0, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TILE_SIZE);

        if (!layer)
        {
            throw new Error('Unable to create scroll tilemap layer.');
        }

        layer.fill(0);

        for (let x = 0; x < MAP_WIDTH; x++)
        {
            layer.putTileAt(1, x, MAP_HEIGHT - 3);
            layer.putTileAt(2, x, MAP_HEIGHT - 2);
            layer.putTileAt(2, x, MAP_HEIGHT - 1);
        }

        for (let x = 8; x < MAP_WIDTH; x += 11)
        {
            const platformY = MAP_HEIGHT - 7 - (x % 3);

            for (let width = 0; width < 5; width++)
            {
                layer.putTileAt(1, x + width, platformY);
            }
        }

        for (let x = 16; x < MAP_WIDTH; x += 23)
        {
            layer.putTileAt(3, x, MAP_HEIGHT - 4);
            layer.putTileAt(3, x, MAP_HEIGHT - 5);
        }
    }

    private createTileTexture ()
    {
        if (this.textures.exists('scroll-tiles'))
        {
            return;
        }

        const texture = this.textures.createCanvas('scroll-tiles', TILE_SIZE * 4, TILE_SIZE);

        if (!texture)
        {
            throw new Error('Unable to create scroll tile texture.');
        }

        const { context } = texture;

        this.drawTile(context, 0, '#7fc8ff', '#bde9ff');
        this.drawTile(context, 1, '#47a857', '#246d34');
        this.drawTile(context, 2, '#8d5a36', '#5e341f');
        this.drawTile(context, 3, '#e0bc5a', '#9b6f26');

        texture.refresh();
    }

    private createPlayerTexture ()
    {
        if (this.textures.exists('player-marker'))
        {
            return;
        }

        const texture = this.textures.createCanvas('player-marker', 32, 32);

        if (!texture)
        {
            throw new Error('Unable to create player texture.');
        }

        const { context } = texture;

        context.fillStyle = '#ffffff';
        context.beginPath();
        context.moveTo(28, 16);
        context.lineTo(6, 5);
        context.lineTo(10, 16);
        context.lineTo(6, 27);
        context.closePath();
        context.fill();

        context.lineWidth = 3;
        context.strokeStyle = '#10223a';
        context.stroke();

        texture.refresh();
    }

    private drawTile (context: CanvasRenderingContext2D, index: number, fill: string, accent: string)
    {
        const x = index * TILE_SIZE;

        context.fillStyle = fill;
        context.fillRect(x, 0, TILE_SIZE, TILE_SIZE);

        context.strokeStyle = accent;
        context.lineWidth = 2;
        context.strokeRect(x + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

        context.fillStyle = accent;
        context.globalAlpha = 0.35;
        context.fillRect(x + 6, 8, 20, 4);
        context.fillRect(x + 12, 20, 14, 4);
        context.globalAlpha = 1;
    }
}
