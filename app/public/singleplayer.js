var config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    backgroundColor: '#bfcc00',
    parent: 'phaser-example',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
var gridSize = 40;
var gridWidth = config.width / gridSize; 
var gridHeight = config.height / gridSize; 

var cursors;

//  Direction const
var UP = 0;
var DOWN = 1;
var LEFT = 2;
var RIGHT = 3;

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('grass', 'assets/grass.png');
    this.load.image('food', 'assets/apple.png');
    this.load.image('body', 'assets/head_up.png');
    this.load.image('headUp', 'assets/head_up.png');
    this.load.image('headDown', 'assets/head_down.png');
    this.load.image('headLeft', 'assets/head_left.png');
    this.load.image('headRight', 'assets/head_right.png');
}

function create ()
{

    var Food = new Phaser.Class({

        Extends: Phaser.GameObjects.Image,

        initialize:

        function Food (scene, x, y)
        {
            Phaser.GameObjects.Image.call(this, scene)

            this.setTexture('food');
            this.setPosition(x * gridSize, y * gridSize);
            this.setOrigin(0);

            this.total = 0;

            scene.children.add(this);
        },

        eat: function ()
        {
            this.total++;
        }

    });

    var Snake = new Phaser.Class({

        initialize:

        function Snake (scene, x, y, id)
        {
            this.headPosition = new Phaser.Geom.Point(x, y);

            this.body = scene.add.group();

            this.head = this.body.create(x * gridSize, y * gridSize, 'headRight');
            //setting origin to center of sprite for better rotation
            this.head.setOrigin(0);

            this.alive = true;

            this.speed = 200;

            this.moveTime = 0;

            this.tail = new Phaser.Geom.Point(x, y);

            this.heading = RIGHT;
         
            this.direction = RIGHT;
            this.id = id || 'self';
        },

        update: function (time)
        {
            if (time >= this.moveTime)
            {
                return this.move(time);
            }
        },

        faceLeft: function ()
        {
            if (this.direction === UP || this.direction === DOWN)
            {
                this.heading = LEFT;
             
            }
        },

        faceRight: function ()
        {
            if (this.direction === UP || this.direction === DOWN)
            {
                this.heading = RIGHT;
               
            }
        },

        faceUp: function ()
        {
            if (this.direction === LEFT || this.direction === RIGHT)
            {
                this.heading = UP;
              
            }
        },

        faceDown: function ()
        {
            if (this.direction === LEFT || this.direction === RIGHT)
            {
                this.heading = DOWN;
               
            }
        },

        move: function (time)
        {
            switch (this.heading)
            {
                case LEFT:
                    this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x - 1, 0, gridWidth);
                    this.head.setTexture("headLeft");
                    break;

                case RIGHT:
                    this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x + 1, -1, gridWidth);
                    this.head.setTexture("headRight");
                    break;

                case UP:
                    this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y - 1, 0, gridHeight);
                    this.head.setTexture("headUp");
                    break;

                case DOWN:
                    this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y + 1, -1, gridHeight);
                    this.head.setTexture("headDown");
                    break;
            }

            this.direction = this.heading;

            //  Update the body segments and place the last coordinate into this.tail
            Phaser.Actions.ShiftPosition(this.body.getChildren(), this.headPosition.x * gridSize, this.headPosition.y * gridSize, 1, this.tail);

            //  Check to see if any of the body pieces have the same x/y as the head
            //  If they do, the head ran into the body

            var hitBody = Phaser.Actions.GetFirst(this.body.getChildren(), { x: this.head.x, y: this.head.y }, 1);

            if (hitBody)
            {
                console.log('dead');

                this.alive = false;

                return false;
            }
            else
            {
                //  Update the timer ready for the next movement
                this.moveTime = time + this.speed;

                return true;
            }
        },

        grow: function ()
        {
            var newPart = this.body.create(this.tail.x, this.tail.y, 'body');

            newPart.setOrigin(0);
        },

        collideWithFood: function (food)
        {
            if (this.head.x === food.x && this.head.y === food.y)
            {
                this.grow();

                food.eat();

                //  For every 5 items of food eaten we'll increase the snake speed a little
                if (this.speed > 20 && food.total % 5 === 0)
                {
                    this.speed -= 5;
                }

                return true;
            }
            else
            {
                return false;
            }
        },

        updateGrid: function (grid)
        {
            this.body.children.each(function (segment) {

                var bx = segment.x / gridSize;
                var by = segment.y / gridSize;

                grid[by][bx] = false;

            });

            return grid;
        }



    });
    
    this.add.grid(config.width / 2, config.height / 2, config.width, config.height, gridSize, gridSize, 0xacd05e).setAltFillStyle(0xb3d665).setOutlineStyle();
    food = new Food(this, 3, 4);
    snake = new Snake(this, 8, 8); 
    cursors = this.input.keyboard.createCursorKeys();
}

function update (time, delta)
{
    if (!snake.alive)
    {
        return;
    }

    if (cursors.left.isDown)
    {
        snake.faceLeft();
    }
    else if (cursors.right.isDown)
    {
        snake.faceRight();
    }
    else if (cursors.up.isDown)
    {
        snake.faceUp();
    }
    else if (cursors.down.isDown)
    {
        snake.faceDown();
    }

    if (snake.update(time))
    {

        if (snake.collideWithFood(food))
        {
            repositionFood();
        }
    }
}

function repositionFood ()
{
    var testGrid = [];

    for (var y = 0; y < gridHeight; y++)
    {
        testGrid[y] = [];

        for (var x = 0; x < gridWidth; x++)
        {
            testGrid[y][x] = true;
        }
    }

    snake.updateGrid(testGrid);

    var validLocations = [];

    for (var y = 0; y < gridHeight; y++)
    {
        for (var x = 0; x < gridWidth; x++)
        {
            if (testGrid[y][x] === true)
            {
                validLocations.push({ x: x, y: y });
            }
        }
    }

    if (validLocations.length > 0) {
        var pos = Phaser.Math.RND.pick(validLocations);
        food.setPosition(pos.x * gridSize, pos.y * gridSize);
        return true;
        } else {
        return false;
    }
}
