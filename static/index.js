'use strict';
const COLORS = ["red", "green", "blue", "white"]
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
    return {
        top: TILES[i][0],
        right: TILES[i][1],
        bottom: TILES[i][2],
        left: TILES[i][3],
        html: $(`<svg class="tile" id="${Tile.nextId++}"><g transform="scale(50)"><rect fill="${COLORS[TILES[i][3]]}" height="2" width="2"/><path d="M 1,1 L 0,0 L 2,0 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][0]]}" fill="${COLORS[TILES[i][0]]}" /><path d="M 1,1 L 2,0 L 2,2 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][1]]}" fill="${COLORS[TILES[i][1]]}" /><path d="M 1,1 L 2,2 L 0,2 Z" stroke-width="0.02" stroke="${COLORS[TILES[i][2]]}" fill="${COLORS[TILES[i][2]]}" /><rect fill="none" width="2" height="2" stroke="#000" stroke-width="0.04" width="100"/></g></svg>`),
        markDraggable() {
            this.html.on("mousedown", this.onMouseDown.bind(this));
        },
        markUndraggable() {
            this.html.off("mousedown");
            this.html.off("mouseup");
            this.html.off("mousemove");
        },
        onMouseDown(ev) {
            let shiftX = ev.clientX - this.html[0].getBoundingClientRect().left;
            let shiftY = ev.clientY - this.html[0].getBoundingClientRect().top;
            const oldParent = this.html.parent();

            this.html.css("position", "absolute");
            this.html.toggleClass("dragged", true);
            this.html.css("zIndex", 1000);
            $("body").append(this.html);

            let currentDroppable = null;

            function moveAt(pageX, pageY){
                this.html.css("left", pageX - shiftX + "px");
                this.html.css("top", pageY - shiftY + "px");
            }

            function onMouseUp(ev) {
                $(document).off("mousemove");
                this.html.toggleClass("dragged", false);
                $(currentDroppable).css("border", "1px solid black");
                //game.dragAndDrop(oldParent, newParent);
            }

            function onMouseMove(ev) {
                moveAt.bind(this)(ev.pageX, ev.pageY);

                let square = null;
                this.html[0].hidden = true;
                let elemBelow = document.elementFromPoint(ev.clientX, ev.clientY); // This is grabbing part of the SVG. why?
                this.html[0].hidden = false;
                if (elemBelow) square = elemBelow.closest(".square");
                currentDroppable = square;
            }

            $(document).on("mousemove", onMouseMove.bind(this));
            this.html.on("mouseup", onMouseUp.bind(this));
        },
        snapBack() {
            this.oldParent.append(this.html);
            this.oldParent = null;
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
    const tile = {
        html: $('<div class="square"></div>'),
        // A slot where tiles can be placed. Doesn't know about game logic.
        place: place,
        init() {
            this.html.on("drop", this.onDrop.bind(this));
            this.html.on("dragover", this.onDragOver.bind(this));
            this.html.data("place", this.place);
        },
        onDragOver(ev) { // Allow Drop
            //console.log("onAllowDrop", ev);
            ev.preventDefault();
        },
        onDrop(ev) {
            ev.preventDefault();
            var data = ev.originalEvent.dataTransfer.getData("text");
            const tile = document.getElementById(data);
            // Check if allowed
            // If so, call square.move
            //const source = Square.find($(tile).parent().data("place"));
            //const target = this;
            //game.onDragDrop(source, target)
            console.log("onDrop", data, tile, "hello");
            ev.target.appendChild(tile);
        },
        moveTo(square) {
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
        }
    }
    tile.init();
    return tile;
}
Square.find = function(place) {
    if (place[0] == "grid") {
        return game.grid[place[1]][place[2]];
    } else if (place[0] == "pool") {
        return game.pool[place[1]];
    }
}

const game = {
    attach(html) {
        this.html = html;
    },
    start() {
        // Grid
        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;
        this.html.grid.empty();
        this.addHtmlRowBottom();
        this.grid = [[]];
        this.addGridSquare({row: 0, col: 0})
        // Pool
        this.html.pool.empty();
        this.pool = [];
        for (let i=0; i<10; i++) this.addPoolSquare(i);
        for (let i=0; i<10; i++) this.drawPoolTile(i);
        // Game logic
        // invalidTile and poolVacancy are either both set or both null.
        // There is only allowed to be one tile in an invalid position at a time.
        this.invalidTile = null;
        this.poolVacancy = null;
    },
    newHtmlRow() { return $("<tr></tr>"); },
    addHtmlRowTop() { this.html.grid.prepend(this.newHtmlRow()); },
    addHtmlRowBottom() { this.html.grid.append(this.newHtmlRow()); },
    addGridSquare(loc) {
        const square = new Square("grid", loc.row, loc.col);
        this.grid[loc.row][loc.col] = square;
        const row = this.html.grid.find("tr").eq(loc.row);
        if (!row) {
            const tr = $("<tr></tr>")
            this.html.grid.after(tr);
        }
        if (loc.col == 0) {
            row.prepend(square.html);
        } else {
            row.eq(loc.col).after(square.html); // Hack! Assumes no gaps
        }
    },
    addPoolSquare(slot) {
        const square = new Square("pool", slot);
        this.pool[slot] = square;
        this.html.pool.append(square.html); // Hack! Assumes left-to-right
    },
    drawPoolTile(slot) {
        const tile = Tile.random();
        this.pool[slot].place(tile);
        tile.markDraggable();
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
    neighbors(loc) {
        return {
            top:    this.grid[loc.row-1][loc.col].tile,
            bottom: this.grid[loc.row+1][loc.col].tile,
            left:   this.grid[loc.row][loc.col-1].tile,
            right:  this.grid[loc.row][loc.col+1].tile,
        }
    },
    canPlaceTileFromPool(tile, loc, slot) {
        if (this.invalidTile) return false;
        if (!validTargetSquare(loc)) return false;
        return true;
    },
    validTargetSquare(loc) {
        // A target is valid if it has any neighbor
        const n = neighbors(loc);
        return n.top || n.bottom || n.left || n.right;
    },
    isTileValid(tile, loc) {
        // Does it fit with all its current neighbors?
        const n = neighbors(loc);
        return ((!n.top || n.top.bottom == tile.top) &&
                (!n.bottom || n.bottom.top == tile.bottom) &&
                (!n.left || n.left.right == tile.left) &&
                (!n.right || n.right.left == tile.right));
    },
    canMoveTileToPool(tile, loc, slot) {
        if (this.poolSquare[slot].tile != null) return false;
        return this.invalidTile == tile;
    },
    onDragDrop(sourceSquare, targetSquare) {
        // Find tile's original square
        // Find original square position
        // Find target square position
    },
    moveTileToPool(tile, loc, slot) {
        tile.markInert();
        tile.markDraggable();
        this.grid[loc.row][loc.col].moveTileTo(this.poolSquare[slot]);
        this.invalidTile = null;
        this.poolVacancy = null;
    },
    placeTileFromPool(tile, loc, slot) {
        const can = canPlaceTileFromPool(tile, loc, slot);
        if (!can) return; // Rejected!
        const valid = isTileValid(tile, loc);
        this.poolSquare[slot].moveTileTo(this.grid[loc.row][loc.col]);
        if (valid) {
            tile.markValid();
            tile.markUndraggable();

            // Expand if needed
            if (loc.row==this.top) this.expendAreaTop();
            if (loc.row==this.bottom) this.expendAreaBottom();
            if (loc.col==this.left) this.expendAreaLeft();
            if (loc.col==this.right) this.expendAreaRight();

            // Draw to replace pool
            this.drawPoolTile(this.poolVacancy);
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
    });
    game.start();
});
