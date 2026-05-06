import { Scene } from 'phaser';
import type { GameSession } from '../gameTypes.ts';

type CreditSection = {
    heading: string;
    roles: string[];
};

const CREDIT_NAME = 'baguettefr';
const CREDIT_SECTIONS: CreditSection[] = [
    {
        heading: 'Creative Direction',
        roles: [
            'Creative Director',
            'Executive Creative Director',
            'Principal Artist',
            'Lead Artist',
            'Artist 1',
            'Artist 2',
            'Artist 3',
            'Concept Artist',
            'Background Artist',
            'Pixel Artist',
            'Very Serious Sword Consultant'
        ]
    },
    {
        heading: 'Game Design',
        roles: [
            'Game Designer',
            'Lead Game Designer',
            'Principal Game Designer',
            'Systems Designer',
            'Combat Designer',
            'Encounter Designer',
            'World Designer',
            'Quest Designer',
            'Card Reader Designer',
            'Name Input Sabotage Designer',
            'Suspicious Wisdom Designer'
        ]
    },
    {
        heading: 'Programming',
        roles: [
            'Lead Programmer',
            'Principal Programmer',
            'Gameplay Programmer',
            'UI Programmer',
            'Tools Programmer',
            'Build Engineer',
            'Engine Integrator',
            'Battle Flow Programmer',
            'Input Programmer',
            'Secret Gift Fragmentation Engineer',
            'Card Slot Alignment Specialist'
        ]
    },
    {
        heading: 'Production',
        roles: [
            'Executive Producer',
            'Senior Executive Producer',
            'Producer',
            'Associate Producer',
            'Assistant Producer',
            'Production Coordinator',
            'Milestone Wrangler',
            'Scope Negotiator',
            'Schedule Optimist',
            'Meeting Survivor',
            'Final Final Final Build Owner'
        ]
    },
    {
        heading: 'Writing',
        roles: [
            'Lead Writer',
            'Narrative Designer',
            'Dialogue Writer',
            'Joke Approval Committee',
            'Lore Keeper',
            'Wall Text Author',
            'Boss Name Poet',
            'Cloud Regret Specialist',
            'Knight Apology Supervisor',
            'baguettefr Quote Archivist'
        ]
    },
    {
        heading: 'Audio',
        roles: [
            'Audio Director',
            'Music Composer',
            'Sound Designer',
            'Battle Whoosh Designer',
            'Menu Silence Curator',
            'Dramatic Pause Operator',
            'Card Reader Beep Consultant',
            'Footstep Imaginer',
            'Victory Sting Hummer'
        ]
    },
    {
        heading: 'Quality Assurance',
        roles: [
            'QA Lead',
            'QA Tester',
            'Senior QA Tester',
            'Regression Tester',
            'Collision Tester',
            'Wall Interaction Tester',
            'Flying Enemy Tester',
            'Fear Mechanic Tester',
            'Can You Still Press E Tester',
            'Credits Length Auditor',
            'Professional Button Masher'
        ]
    },
    {
        heading: 'Executive Leadership',
        roles: [
            'Chief Executive Officer',
            'Chief Operating Officer',
            'Chief Technology Officer',
            'Chief Quest Officer',
            'Chief Baguette Officer',
            'Vice President of Cards',
            'Vice President of Tiny Approving Nods',
            'Senior Vice President of Suspense',
            'Board Member',
            'Shadow Board Member',
            'Executive Executive'
        ]
    },
    {
        heading: 'Special Thanks',
        roles: [
            'The Hub Wall',
            'The Green Card',
            'The Blue Card',
            'The Red Card',
            'Every Rectangle On Screen',
            'The Correct Seed Game Code',
            'Everyone Who Walked Back To The Wall',
            'No Automated Tests',
            'The Player',
            'baguettefr'
        ]
    }
];

export class Credits extends Scene
{
    private creditsText: Phaser.GameObjects.Text;
    private hintText: Phaser.GameObjects.Text;
    private session?: GameSession;

    constructor ()
    {
        super('Credits');
    }

    create (data: { session?: GameSession })
    {
        this.session = data.session;
        this.cameras.main.setBackgroundColor(0x111827);

        this.add.image(512, 384, 'background').setAlpha(0.2);
        this.add.rectangle(512, 384, 1024, 768, 0x10131f, 0.62);

        this.add.text(512, 44, 'CREDITS', {
            fontFamily: 'Arial Black',
            fontSize: 42,
            color: '#fff6c4',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(10);

        this.hintText = this.add.text(512, 724, 'Click or press Enter to return to the Main Menu', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5).setDepth(10);

        this.creditsText = this.add.text(512, 820, this.buildCreditsText(), {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5, 0);

        this.tweens.add({
            targets: this.creditsText,
            y: -this.creditsText.height - 160,
            duration: 118000,
            ease: 'Linear',
            onComplete: () => {
                this.hintText.setText('The credits are complete. Click or press Enter.');
            }
        });

        this.input.once('pointerdown', () => {
            this.returnToMainMenu();
        });

        this.input.keyboard?.once('keydown-ENTER', () => {
            this.returnToMainMenu();
        });
    }

    private returnToMainMenu ()
    {
        this.scene.start('MainMenu', { session: this.session });
    }

    private buildCreditsText ()
    {
        return CREDIT_SECTIONS.map((section) => {
            const roles = section.roles.map((role) => `${role}\n${CREDIT_NAME}`).join('\n\n');

            return `${section.heading}\n\n${roles}`;
        }).join('\n\n\n');
    }
}
