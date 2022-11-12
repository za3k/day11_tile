'use strict';
//const COLORS = ["red", "green", "blue", "white"]
const COLORS = ["#994F00", "#006CD1", "#E1BE6A", "#40B0A6"]
const TILES = [
    [0,0,0,1],
    [2,0,2,1],
    [0,1,1,1],
    [3,2,0,2],
    [2,2,3,2],
    [3,3,0,3],
    [0,1,2,3],
    [2,3,2,0],
    [2,0,3,0],
    [1,1,2,0],
    [0,3,0,1],
]

function Tile(i) {
    const id = Tile.nextId++;
    return {
        top: TILES[i][0],
        right: TILES[i][1],
        bottom: TILES[i][2],
        left: TILES[i][3],
        html: $(`<svg class="tile" id="${Tile.nextId++}"><g transform="scale(40)"><rect fill="${COLORS[TILES[i][3]]}" height="2" width="2"/><path d="M 1,1 L 0,0 L 2,0 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][0]]}" fill="${COLORS[TILES[i][0]]}" /><path d="M 1,1 L 2,0 L 2,2 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][1]]}" fill="${COLORS[TILES[i][1]]}" /><path d="M 1,1 L 2,2 L 0,2 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][2]]}" fill="${COLORS[TILES[i][2]]}" /><rect fill="none" width="2" height="2" stroke="#000" stroke-width="0.04"/></g></svg>`),
        id: id,
        markDraggable() {
            if (!this.draggable) this.html.on("mousedown", this.onMouseDown.bind(this));
            this.draggable = true;
        },
        markUndraggable() {
            this.html.off("mousedown");
            this.html.off("mouseup");
            this.html.off("mousemove");
        },
        onMouseDown(ev) {
            let shiftX = ev.clientX - this.html[0].getBoundingClientRect().left;
            let shiftY = ev.clientY - this.html[0].getBoundingClientRect().top;

            const moveAt = ((pageX, pageY) => {
                this.html.css("left", pageX - shiftX + "px");
                this.html.css("top", pageY - shiftY + "px");
            }).bind(this);
            moveAt(ev.pageX, ev.pageY);

            const oldParentHtml = this.html.parent();
            if (!oldParentHtml) throw "HUH!??";

            this.html.css("position", "absolute");
            this.html.toggleClass("dragged", true);
            this.html.css("zIndex", 1000);
            $("body").append(this.html);

            let currentDroppable = null;

            function onMouseUp(ev) {
                $(document).off("mousemove");
                this.html.off("mouseup");
                this.html.toggleClass("dragged", false);
                this.html.css("position", "relative");
                this.html.css("left","");
                this.html.css("top","");
                this.html.css("zIndex","");

                let error = "Drag tiles onto a square";
                if (currentDroppable) {
                    if (oldParentHtml[0] == document.body) debugger;
                    const oldParent = Square.fromDom(oldParentHtml);
                    const newParent = Square.fromDom($(currentDroppable));
                    error = game.onDragDrop(oldParent, newParent);
                }
                if (error) {
                    oldParentHtml.append(this.html);
                }
                game.error(error);
            }

            function onMouseMove(ev) {
                moveAt(ev.pageX, ev.pageY);

                let square = null;
                // No matter what I do, this returns the svg too. this.html[0].hidden = true does nothing, which https://developer.mozilla.org/en-US/docs/Web/API/Document/elementsFromPoint supports.
                let elemsBelow = document.elementsFromPoint(ev.clientX, ev.clientY);
                for (let i=0; i<elemsBelow.length; i++)
                    if (elemsBelow[i].classList.contains("square")) square = elemsBelow[i];
                currentDroppable = square;
            }

            $(document).on("mousemove", onMouseMove.bind(this));
            this.html.on("mouseup", onMouseUp.bind(this));
        },
        markInert() {
            this.html.toggleClass("valid", false);
            this.html.toggleClass("invalid", false);
        },
        markValid() {
            this.html.toggleClass("valid", true);
            this.html.toggleClass("invalid", false);
        },
        markInvalid() {
            this.html.toggleClass("valid", false);
            this.html.toggleClass("invalid", true);
        },
    }
}
Tile.nextId=1;
Tile.random = function() {
    const i = Math.floor(Math.random()*11);
    return new Tile(i);
}

function Square(place) {
    const sq = {
        html: $('<div class="square"></div>'),
        // A slot where tiles can be placed. Doesn't know about game logic.
        _place: place,
        isPool: place[0]=="pool",
        isGrid: place[0]=="grid",
        loc: place[1],
        slot: place[1],
        init() {
            this.html.data("place", this._place);
            //this.html.text(JSON.stringify(this._place[1]));
        },
        moveTileTo(square) {
            square.place(this.tile);
            this._remove();
        },
        place(tile) {
            this.tile = tile;
            this.html.append(tile.html);
        },
        _remove(tile) {
            this.tile = null;
            // No HTML needed
        },
        markVisible() {
            this.html.toggleClass("visible", true);
        },
        markInvisible() {
            this.html.toggleClass("visible", false);
        },
    }
    sq.init();
    return sq;
}
Square.find = function(place) {
    if (!place) debugger;
    if (place[0] == "grid") {
        return game.grid[place[1].row][place[1].col];
    } else if (place[0] == "pool") {
        return game.pool[place[1]];
    }
}
Square.fromDom = function(e) {
    const place = e.data("place");
    return Square.find(place);
}

const game = {
    attach(html) {
        this.html = html;
    },
    start() {
        this.points = 0;
        // Grid
        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;
        this.html.grid.empty();
        this.addHtmlRowBottom();
        this.grid = [[]];
        this.addGridSquare({row: 0, col: 0})
        this.grid[0][0].markVisible();
        // Pool
        this.html.pool.empty();
        this.pool = [];
        for (let i=0; i<11; i++) this.addPoolSquare(i);
        for (let i=0; i<11; i++) this.drawPoolTile(i);
        // Game logic
        // invalidTile and poolVacancy are either both set or both null.
        // There is only allowed to be one tile in an invalid position at a time.
        this.invalidTile = null;
        this.poolVacancy = null;
    },
    newHtmlRow() { return $('<div class="grid-row"></div>'); },
    addHtmlRowTop() { this.html.grid.prepend(this.newHtmlRow()); },
    addHtmlRowBottom() { this.html.grid.append(this.newHtmlRow()); },
    addGridSquare(loc) {
        const square = new Square(["grid", loc]);
        square.markInvisible();
        this.grid[loc.row][loc.col] = square;
        const i=loc.row-this.top;
        const j=loc.col-this.left;
        const row = this.html.grid.find(".grid-row").eq(i);
        if (!row) debugger;
        if (j == 0) {
            row.prepend(square.html);
        } else {
            row.find(".square").eq(j-1).after(square.html); // Hack! Assumes no gaps
        }
    },
    addPoolSquare(slot) {
        const square = new Square(["pool", slot]);
        this.pool[slot] = square;
        this.html.pool.append(square.html); // Hack! Assumes left-to-right
    },
    drawPoolTile(slot) {
        const tile = Tile.random();
        this.pool[slot].place(tile);
        tile.markDraggable();
    },
    incrementScore() {
        this.html.score.text(++this.points);
    },
    addCol(col) { for (let i=this.top; i<=this.bottom; i++) this.addGridSquare({row: i, col:col}); },
    addRow(row) { for (let i=this.left; i<=this.right; i++) this.addGridSquare({row: row, col:i}); },
    expandAreaRight() {
        this.right++;
        this.addCol(this.right);
    },
    expandAreaLeft() {
        this.left--;
        this.addCol(this.left);
    },
    expandAreaTop() {
        this.top--;
        this.grid[this.top] = [];
        this.addHtmlRowTop();
        this.addRow(this.top);
    },
    expandAreaBottom() {
        this.bottom++;
        this.grid[this.bottom] = [];
        this.addHtmlRowBottom();
        this.addRow(this.bottom);
    },
    neighborSquares(loc) {
        const get = (function(row, col) {
            return (this.grid[row]||[])[col];
        }).bind(this)
        return {
            top:    get(loc.row-1, loc.col),
            bottom: get(loc.row+1, loc.col),
            left:   get(loc.row, loc.col-1),
            right:  get(loc.row, loc.col+1),
        }
    },
    neighborTiles(loc) {
        let r = {};
        for (let [dir, neighborSquare] of Object.entries(this.neighborSquares(loc)))
            r[dir]=neighborSquare ? neighborSquare.tile : null;
        return r;
    },
    canPlaceTileFromPool(tile, slot, loc) {
        console.log("canPlaceTileFromPool");
        if (this.invalidTile) return false;
        if (!this.validTargetSquare(loc)) return false;
        return true;
    },
    validTargetSquare(loc) {
        // A target is valid if it has any neighbor
        // TODO: Restrict to a maximum size, like 5x5 or 10x10
        if (loc.row == 0 && loc.col == 0) return true; // Bootstrap
        const n = this.neighborTiles(loc);
        return n.top || n.bottom || n.left || n.right;
    },
    isTileValid(tile, loc) {
        // Does it fit with all its current neighbors?
        const n = this.neighborTiles(loc);
        return ((!n.top || n.top.bottom == tile.top) &&
                (!n.bottom || n.bottom.top == tile.bottom) &&
                (!n.left || n.left.right == tile.left) &&
                (!n.right || n.right.left == tile.right));
    },
    canMoveTileToPool(tile, loc, slot) {
        if (this.pool[slot].tile != null) return false;
        return this.invalidTile == tile;
    },
    onDragDrop(sourceSquare, targetSquare) {
        //console.log("source", sourceSquare);
        //console.log("target", targetSquare);
        if (!targetSquare) return "You must drag to a square";
        if (!sourceSquare) throw "HUH";
        const tile = sourceSquare.tile;
        if (sourceSquare.isPool && targetSquare.isGrid) {
            if (!this.canPlaceTileFromPool(tile, sourceSquare.slot, targetSquare.loc)) return "You must drag to a neighboring, unoccupied square";
            this.placeTileFromPool(tile, sourceSquare.slot, targetSquare.loc);
            return;
        } else if (sourceSquare.isGrid && targetSquare.isPool) {
            if (!this.canMoveTileToPool(tile, sourceSquare.loc, targetSquare.slot)) return "You must drag to an empty square";
            this.moveTileToPool(tile, sourceSquare.loc, targetSquare.slot);
        } else if (sourceSquare.isPool && targetSquare.isPool) {
            if (!this.canMovePoolToPool(tile, sourceSquare.slot, targetSquare.slot)) return "You must drag to an empty square";
            this.movePoolToPool(tile, sourceSquare.slot, targetSquare.slot);
        } else if (sourceSquare.isGrid && targetSquare.isGrid) {
            // Always disallow because of complications with determining neighbors, etc
            return "You must drag the tile back to your hand first";
        } else {
            debugger;
            return "This should never be reached";
        }
        // Parent should NOT be body here.
    },
    error(m) {
        this.html.error.text(m||"");
    },
    canMovePoolToPool(tile, slotFrom, slotTo) {
        return !this.pool[slotTo].tile;
    },
    movePoolToPool(tile, slotFrom, slotTo) {
        console.log("movePoolToPool", tile, slotFrom, slotTo);
        this.pool[slotFrom].moveTileTo(this.pool[slotTo]);
        this.poolVacancy = slotFrom;
    },
    moveTileToPool(tile, loc, slot) {
        console.log("moveTileToPool", tile, loc, slot);
        tile.markInert();
        tile.markDraggable();
        this.grid[loc.row][loc.col].moveTileTo(this.pool[slot]);
        this.invalidTile = null;
        this.poolVacancy = null;
    },
    placeTileFromPool(tile, slot, loc) {
        console.log("placeTileFromPool", tile, slot, loc);
        const valid = this.isTileValid(tile, loc);
        this.pool[slot].moveTileTo(this.grid[loc.row][loc.col]);
        if (valid) {
            tile.markValid();
            tile.markUndraggable();

            // Expand if needed
            if (loc.row==this.top) this.expandAreaTop();
            if (loc.row==this.bottom) this.expandAreaBottom();
            if (loc.col==this.left) this.expandAreaLeft();
            if (loc.col==this.right) this.expandAreaRight();
            for (let [dir, neighbor] of Object.entries(this.neighborSquares(loc))) neighbor.markVisible();

            // Draw to replace pool
            this.drawPoolTile(slot);

            this.incrementScore();
        } else {
            tile.markInvalid();
            tile.markDraggable();
            this.invalidTile = tile;
            this.poolVacancy = slot;
        }
    },
    allTilesGreen() {
        return true;
    },
};

$(document).ready(() => {
    game.attach({
        grid: $(".grid"),
        pool: $(".pool"),
        error: $(".error"),
        score: $(".score"),
    });
    game.start();
});
