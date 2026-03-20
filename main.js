let game = {
    tickspeed: 3,
    status: "idle",
    drag: [null, null],

    level: 1,
    level_goal: 2000,
    level_progress: 0,

    lives: 3,

    boost: 1,
    boost_goal: 4,
    boost_progress: 0,

    score: 0,
    old_score: 0,
    new_score: 0,
    score_ticks: 0,
    cascades: 0,
    gems_destroyed: 0,

    grid: new Array(8),
    specials: [0, 0, 0, 0],
    next_black: 1 + Math.floor(Math.random() * 105),
    black_count: 0,
    black_popped: 0,
    next_bomb: 8,
    next_lock: 10,
    doom_goal: 400 + Math.floor(Math.random() * 801),
    doom_spawned: false,
    doom_spawning: false,
    bad_count: 0,
    bad_block: false,
}

for (let i = 0; i < 8; i++) {
    game.grid[i] = new Array(8).fill(null)
}

function format_num(num) {
    let negative = false
    if (num < 0) {
        negative = true
        num *= -1
    }

    let output = num.toString()
    if (num >= 1000) {
        let digits = output.length
        for (let i = digits - 3; i > 0; i -= 3) {
            output = output.substr(0, i) + "," + output.substr(i)
        }
    }

    if (num >= 2 ** 53) {
        output = "Infinity"
    }
    if (negative) {
        output = "-" + output
    }

    return output
}

class gem {
    static list = []

    x
    y
    color
    type

    constructor(x, y, color, type) {
        this.x = x
        this.y = y
        if (color !== undefined) this.color = color
        else {
            this.color = Math.floor(Math.random() * 7)
            if (game.status !== "levelup") {
                game.next_black--
                if (game.next_black <= 0) {
                    let min = Math.min(16, 35 - game.level)
                    if (game.black_count >= 4)
                        min = Math.ceil(min * (0.25 + game.black_count * 0.25))
                    game.next_black =
                        min + Math.floor(Math.random() * (min * 3 + 1))
                    if (game.level >= 3) {
                        this.color = 7
                        game.black_count++
                    }
                }
            }
        }
        if (type !== undefined) this.type = type
        else this.type = 0
        if (this.type === 5) this.timer = Math.max(22 - game.level, 5)

        game.grid[x][y] = this.color

        gem.list.push(this)

        let element = document.createElement("DIV")
        element.className = "gem"
        const colors = [
            "red",
            "orange",
            "yellow",
            "green",
            "blue",
            "purple",
            "white",
            "black",
        ]
        element.style.backgroundImage =
            "url('sprites/" + colors[this.color] + "_gem.png')"
        element.style.left = 4 * x + "em"
        element.style.top = 4 * y + "em"
        if (this.type >= 1) {
            let overlay = document.createElement("DIV")
            overlay.className = "gem_overlay"
            switch (this.type) {
                case 1:
                    overlay.style.backgroundImage =
                        "url('sprites/flame_gem.png')"
                    break
                case 2:
                    overlay.style.backgroundImage =
                        "url('sprites/lightning_gem.png')"
                    break
                case 4:
                    overlay.style.backgroundImage =
                        "url('sprites/hypercube_gem.png')"
                    break
                case 5:
                    overlay.style.backgroundImage =
                        "url('sprites/bomb_gem.png')"
                    break
            }
            overlay.style.left = 0 + "em"
            overlay.style.top = 0 + "em"
            element.appendChild(overlay)

            if (this.type === 5) {
                let digit_t = document.createElement("DIV")
                digit_t.className =
                    "gem_overlay " + colors[this.color] + "_counter"
                digit_t.style.backgroundImage =
                    "url('sprites/bomb_timers/" +
                    (Math.floor(this.timer / 10) % 10) +
                    "0.png')"
                digit_t.style.left = 0 + "em"
                digit_t.style.top = 0 + "em"
                overlay.appendChild(digit_t)

                let digit_u = document.createElement("DIV")
                digit_u.className =
                    "gem_overlay " + colors[this.color] + "_counter"
                digit_u.style.backgroundImage =
                    "url('sprites/bomb_timers/" + (this.timer % 10) + ".png')"
                digit_u.style.left = 0 + "em"
                digit_u.style.top = 0 + "em"
                overlay.appendChild(digit_u)

                this.digits = [digit_t, digit_u]
            }
        }
        element.addEventListener("mousedown", e => {
            e.preventDefault()
            if (game.status === "idle") {
                game.drag[0] = [this.x, this.y]

                game.status = "drag"
                document.getElementById("gem_grid").className = "status_drag"
            }
        })
        element.addEventListener("mouseup", () => {
            if (game.status === "drag") {
                game.drag[1] = [this.x, this.y]
                let success = move_gem()
                if (success) {
                    game.status = "checking"
                    document.getElementById("gem_grid").className =
                        "status_other"
                    window.setTimeout(match_check, 1000 / game.tickspeed)
                } else {
                    game.status = "idle"
                    document.getElementById("gem_grid").className =
                        "status_idle"
                }
            }
        })
        element.addEventListener("touchstart", e => {
            e.preventDefault()
            if (game.status === "idle") {
                game.drag[0] = [this.x, this.y]

                game.status = "drag"
                document.getElementById("gem_grid").className = "status_drag"
            }
        })
        element.addEventListener("touchend", e => {
            e.preventDefault()
            if (game.status === "drag") {
                let touch = e.changedTouches[0]
                let grid = document
                    .getElementById("gem_grid")
                    .getBoundingClientRect()
                let cellSize = grid.width / 8
                let tx = Math.floor((touch.clientX - grid.left) / cellSize)
                let ty = Math.floor((touch.clientY - grid.top) / cellSize)

                game.drag[1] = [tx, ty]
                let success = move_gem()
                if (success) {
                    game.status = "checking"
                    document.getElementById("gem_grid").className =
                        "status_other"
                    window.setTimeout(match_check, 1000 / game.tickspeed)
                } else {
                    game.status = "idle"
                    document.getElementById("gem_grid").className =
                        "status_idle"
                }
            }
        })

        document.getElementById("gem_grid").appendChild(element)
        this.element = element
    }
}

document.body.addEventListener("mousedown", e => {
    e.preventDefault()
})
document.body.addEventListener("mouseup", () => {
    if (game.status === "drag") {
        game.drag[1] = null

        game.status = "idle"
        document.getElementById("gem_grid").className = "status_idle"
    }
})

for (let i = 1; i <= 4; i++) {
    cell = document.createElement("DIV")
    cell.className = "boost_cell unfilled"
    cell.id = "cell" + i
    document.getElementById("boost_progress").appendChild(cell)
}

function score_popup(x, y, num, color) {
    let popup = document.createElement("P")
    popup.className = "score_popup"
    popup.innerHTML = "+" + num
    popup.style.color = color
    popup.style.textShadow = `0em 0em 0.1em ${color}, 0em 0em 0.2em black, 0em 0em 0.3em black, 0em 0em 0.5em black`
    if (num / game.boost >= 1000) {
        popup.style.fontSize = "3em"
        popup.style.fontWeight = "bold"
        popup.style.zIndex = 4
        popup.style.left = (x * 4 + 2) / 3 + "em"
        popup.style.top = (y * 4 - 1) / 3 + "em"
    } else if (num / game.boost >= 250) {
        popup.style.fontSize = "2.5em"
        popup.style.fontWeight = "bold"
        popup.style.zIndex = 3
        popup.style.left = (x * 4 + 2) / 2.5 + "em"
        popup.style.top = (y * 4 - 0.5) / 2.5 + "em"
    } else {
        popup.style.left = x * 2 + 1 + "em"
        popup.style.top = y * 2 + "em"
    }
    document.getElementById("gem_grid").appendChild(popup)

    let start = performance.now()
    let duration = 1000

    function animate(now) {
        let t = (now - start) / duration
        if (t >= 1) {
            popup.remove()
            return
        }
        popup.style.opacity = t < 0.5 ? 1 : 1 - (t - 0.5) * 2

        if (num / game.boost >= 1000) {
            let hue = (now / 2.5) % 360
            let c = `hsl(${hue}, 100%, 65%)`
            popup.style.color = c
            popup.style.textShadow = `0em 0em 0.1em ${c}, 0em 0em 0.2em black, 0em 0em 0.3em black, 0em 0em 0.5em black`
            popup.style.top = (y * 4 - t * 4 - 1) / 3 + "em"
        } else if (num / game.boost >= 250) {
            popup.style.top = (y * 4 - t * 4 - 0.5) / 2.5 + "em"
        } else {
            popup.style.top = y * 2 - t * 2 + "em"
        }

        requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
}

function find_gem(x, y) {
    for (const g of gem.list) {
        if (g.x === x && g.y === y) {
            return g
        }
    }
}

function remove_gem(g, destruction) {
    let x = g.x
    let y = g.y
    let color = g.color
    let type = g.type
    let timer = g.timer
    g.element.remove()
    game.grid[g.x][g.y] = null
    gem.list = gem.list.filter(object => object !== g)
    game.gems_destroyed++

    let old_score = game.new_score > game.score
    if ((type >= 1 && type <= 5) || type === 7) {
        game.specials[type - 1]--
        let score = 0

        if (destruction !== undefined) {
            switch (type) {
                case 1:
                    destruction.score += 100
                    break
                case 2:
                    destruction.score += 300
                    break
                case 3:
                case 4:
                    destruction.score += 500
                    break
                case 5:
                    destruction.score += 100
                    break
                case 7:
                    destruction.score += 50
                    break
            }
        } else {
            switch (type) {
                case 1:
                    score += 200
                    break
                case 2:
                    score += 600
                    break
                case 3:
                case 4:
                    score += 1000
                    break
                case 5:
                    if (color === 7) score += 1000 + timer * 100
                    else score += 200
                    break
                case 7:
                    score += 100
                    break
            }
        }

        switch (type) {
            case 1:
                let tiles = [
                    [1, 0],
                    [1, -1],
                    [0, -1],
                    [-1, -1],
                    [-1, 0],
                    [-1, 1],
                    [0, 1],
                    [1, 1],
                ]
                for (let i = 0; i < 8; i++) {
                    let xx = x + tiles[i][0]
                    let yy = y + tiles[i][1]

                    if (xx >= 0 && xx <= 7 && yy >= 0 && yy <= 7) {
                        if (game.grid[xx][yy] !== null) {
                            remove_gem(find_gem(xx, yy))
                        }
                    }
                }
                break
            case 2:
                for (const g of gem.list) {
                    if (g.x === x || g.y === y) {
                        if (destruction !== undefined) {
                            destruction.score += 20
                        } else {
                            score += 20
                        }
                        remove_gem(g)
                    }
                }
                break
            case 4:
                for (const g of gem.list) {
                    if (g.color === color) {
                        if (destruction !== undefined) {
                            destruction.score += 20
                        } else {
                            score += 20
                        }
                        remove_gem(g)
                    }
                }
                break
        }

        if (destruction === undefined) {
            const colors = [
                "#ff192c",
                "#ff7919",
                "#ffc519",
                "#56ff19",
                "#19aaff",
                "#f719ff",
                "#ffffff",
            ]

            game.new_score += score * game.boost
            if (game.new_score > 2 ** 53) game.new_score = 2 ** 53

            score_popup(x, y, score * game.boost, colors[color])

            game.level_progress += Math.floor(10 * (score * game.boost) ** 0.4)
            document.getElementById("level_progress").style.width =
                32 * Math.min(game.level_progress / game.level_goal, 1) + "em"

            if (game.new_score > game.score) {
                game.old_score = game.score
                game.score_ticks = 0
                if (!old_score) window.setTimeout(animate_score, 20)
            }
        }
    }

    if (color === 7 && type !== 5) {
        game.black_popped++
        game.black_count--
        let score = Math.min(500 + 500 * game.black_popped, 4000)

        game.new_score += score * game.boost
        if (game.new_score > 2 ** 53) game.new_score = 2 ** 53

        score_popup(x, y, score * game.boost, null)

        game.level_progress += Math.floor(10 * (score * game.boost) ** 0.4)
        document.getElementById("level_progress").style.width =
            32 * Math.min(game.level_progress / game.level_goal, 1) + "em"

        if (game.new_score > game.score) {
            game.old_score = game.score
            game.score_ticks = 0
            if (!old_score) window.setTimeout(animate_score, 20)
        }
    }

    if (type >= 5) {
        game.bad_count--

        if (type === 5) {
            if (color === 7) {
                game.boost_progress += 10
            } else {
                game.boost_progress++
            }

            while (game.boost_progress >= game.boost_goal) {
                game.boost_progress -= game.boost_goal
                game.boost++
                game.boost_goal = game.boost * 4
                if (game.boost >= 13) document.getElementById("boost_progress").style.gap = "0em"
                else if (game.boost >= 7) document.getElementById("boost_progress").style.gap = "0.125em"
                else document.getElementById("boost_progress").style.gap = "0.25em"

                for (let i = 1; i <= 4; i++) {
                    cell = document.createElement("DIV")
                    cell.className = "boost_cell unfilled"
                    cell.id = "cell" + (i + game.boost * 4 - 4)
                    document.getElementById("boost_progress").appendChild(cell)
                }
                document.getElementById("boost").innerHTML =
                    "x" + format_num(game.boost)
            }
            for (let i = 1; i <= game.boost_goal; i++) {
                if (game.boost_progress >= i)
                    document.getElementById("cell" + i).className =
                        "boost_cell filled"
                else
                    document.getElementById("cell" + i).className =
                        "boost_cell unfilled"
            }
        }
    }
}

function clear_grid() {
    for (const g of gem.list) {
        g.element.remove()
    }
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            game.grid[i][j] = null
        }
    }
    gem.list = []
}

function move_gem() {
    if (game.drag[0] === null || game.drag[1] === null) return false

    if (
        game.drag[0][0] === game.drag[1][0] &&
        game.drag[0][1] === game.drag[1][1]
    )
        return false

    if (
        game.drag[0][0] !== game.drag[1][0] &&
        game.drag[0][1] !== game.drag[1][1]
    )
        return false

    if (game.drag[0][0] === game.drag[1][0]) {
        let d = find_gem(game.drag[0][0], game.drag[0][1])
        if (d.type === 7 || (d.color === 7 && d.type === 5)) return false

        let min_y = Math.min(game.drag[0][1], game.drag[1][1])
        let max_y = Math.max(game.drag[0][1], game.drag[1][1])
        for (let y = min_y; y <= max_y; y++) {
            let g = find_gem(game.drag[0][0], y)
            if (
                (g.type === 7 || (g.color === 7 && g.type === 5)) &&
                y !== game.drag[0][1]
            )
                return false
        }

        if (game.drag[0][1] < game.drag[1][1]) {
            let count = game.drag[1][1] - game.drag[0][1]
            for (let i = 1; i <= count; i++) {
                let m = find_gem(game.drag[0][0], game.drag[0][1] + i)
                m.y--
                m.element.style.top = 4 * m.y + "em"
            }
        } else {
            let count = game.drag[0][1] - game.drag[1][1]
            for (let i = 1; i <= count; i++) {
                let m = find_gem(game.drag[0][0], game.drag[0][1] - i)
                m.y++
                m.element.style.top = 4 * m.y + "em"
            }
        }

        d.y = game.drag[1][1]
        d.element.style.top = 4 * d.y + "em"

        for (let i = 0; i < 8; i++) {
            game.grid[game.drag[0][0]][i] = find_gem(game.drag[0][0], i).color
        }
    } else if (game.drag[0][1] === game.drag[1][1]) {
        let d = find_gem(game.drag[0][0], game.drag[0][1])
        if (d.type === 7 || (d.color === 7 && d.type === 5)) return false

        let min_x = Math.min(game.drag[0][0], game.drag[1][0])
        let max_x = Math.max(game.drag[0][0], game.drag[1][0])
        for (let x = min_x; x <= max_x; x++) {
            let g = find_gem(x, game.drag[0][1])
            if (
                (g.type === 7 || (g.color === 7 && g.type === 5)) &&
                x !== game.drag[0][0]
            )
                return false
        }

        if (game.drag[0][0] < game.drag[1][0]) {
            let count = game.drag[1][0] - game.drag[0][0]
            for (let i = 1; i <= count; i++) {
                let m = find_gem(game.drag[0][0] + i, game.drag[0][1])
                m.x--
                m.element.style.left = 4 * m.x + "em"
            }
        } else {
            let count = game.drag[0][0] - game.drag[1][0]
            for (let i = 1; i <= count; i++) {
                let m = find_gem(game.drag[0][0] - i, game.drag[0][1])
                m.x++
                m.element.style.left = 4 * m.x + "em"
            }
        }

        d.x = game.drag[1][0]
        d.element.style.left = 4 * d.x + "em"

        for (let i = 0; i < 8; i++) {
            game.grid[i][game.drag[0][1]] = find_gem(i, game.drag[0][1]).color
        }
    }

    return true
}

function match_exists() {
    let h_prev = null
    let v_prev = null

    let h_match = 0
    let v_match = 0

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (game.grid[j][i] === h_prev && game.grid[j][i] < 7) {
                h_match++
                if (h_match >= 2) return true
            } else {
                h_match = 0
            }

            if (game.grid[i][j] === v_prev && game.grid[i][j] < 7) {
                v_match++
                if (v_match >= 2) return true
            } else {
                v_match = 0
            }

            if (j < 7) {
                h_prev = game.grid[j][i]
                v_prev = game.grid[i][j]
            } else {
                h_prev = null
                v_prev = null
            }
        }
    }

    return false
}

function find_matches() {
    let h_prev = null
    let v_prev = null

    let h_match = 0
    let v_match = 0

    let h_start = null
    let v_start = null

    let matches = []

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (game.grid[j][i] === h_prev && game.grid[j][i] < 7) {
                h_match++
            } else {
                if (h_match >= 2)
                    matches.push([h_start, i, 0, j - h_start, h_prev])

                h_match = 0
                h_start = j
            }

            if (game.grid[i][j] === v_prev && game.grid[i][j] < 7) {
                v_match++
            } else {
                if (v_match >= 2)
                    matches.push([i, v_start, 1, j - v_start, v_prev])

                v_match = 0
                v_start = j
            }

            if (j < 7) {
                h_prev = game.grid[j][i]
                v_prev = game.grid[i][j]
            } else {
                h_prev = null
                v_prev = null

                if (h_match >= 2)
                    matches.push([h_start, i, 0, 8 - h_start, game.grid[j][i]])
                if (v_match >= 2)
                    matches.push([i, v_start, 1, 8 - v_start, game.grid[i][j]])

                h_match = 0
                v_match = 0
            }
        }
    }

    return matches
}

function match_check() {
    if (game.cascades === 0) {
        document.getElementById("cascades").innerHTML = "&nbsp;"

        for (const g of gem.list) {
            if (g.type === 5 && g.color < 7) {
                g.timer--
                g.digits[0].style.backgroundImage =
                    "url('sprites/bomb_timers/" +
                    (Math.floor(Math.max(g.timer, 0) / 10) % 10) +
                    "0.png')"
                g.digits[1].style.backgroundImage =
                    "url('sprites/bomb_timers/" +
                    (Math.max(g.timer, 0) % 10) +
                    ".png')"
            }

            if (g.type === 6) {
                g.type = 7
                g.element.className = "gem locked"
                let overlay = g.element.querySelector(".gem_overlay")
                overlay.style.backgroundImage = "url('sprites/locked_gem.png')"
            }

            if (g.type === 8) {
                g.color = 7
                g.type = 5
                if (game.level >= 17) g.timer = 7
                else if (game.level === 16) g.timer = 8
                else if (game.level === 15) g.timer = 9
                else if (game.level === 14) g.timer = 10
                else g.timer = 13
                g.element.style.backgroundImage = "url('sprites/doom_gem.png')"
                g.element.className = "gem locked"
                let overlay = g.element.querySelector(".gem_overlay")
                overlay.remove()

                let digit_t = document.createElement("DIV")
                digit_t.className = "gem_overlay"
                digit_t.style.backgroundImage =
                    "url('sprites/doom_timers/" +
                    (Math.floor(g.timer / 10) % 10) +
                    "0.png')"
                digit_t.style.left = 0 + "em"
                digit_t.style.top = 0 + "em"
                g.element.appendChild(digit_t)

                let digit_u = document.createElement("DIV")
                digit_u.className = "gem_overlay"
                digit_u.style.backgroundImage =
                    "url('sprites/doom_timers/" + (g.timer % 10) + ".png')"
                digit_u.style.left = 0 + "em"
                digit_u.style.top = 0 + "em"
                g.element.appendChild(digit_u)

                g.digits = [digit_t, digit_u]
            }
        }
    }
    if (match_exists()) {
        game.status = "match"
        document.getElementById("gem_grid").className = "status_other"

        if (game.cascades === 0) {
            let max_bad = 3
            if (game.level >= 6)
                max_bad = Math.min(Math.floor(game.level / 3) + 2, 15)

            game.doom_spawning = false
            if (
                game.level >= 13 &&
                game.level_progress >= game.doom_goal &&
                !game.doom_spawned &&
                !game.bad_block
            ) {
                game.doom_spawned = true
                game.doom_spawning = true
                let x = Math.floor(Math.random() * 8)
                let y = Math.floor(Math.random() * 8)
                let g = find_gem(x, y)
                while (g.type !== 0 || g.color === 7) {
                    x = Math.floor(Math.random() * 8)
                    y = Math.floor(Math.random() * 8)
                    g = find_gem(x, y)
                }
                g.type = 8
                let overlay = document.createElement("DIV")
                overlay.className = "gem_overlay"
                overlay.style.backgroundImage =
                    "url('sprites/locking_doom_gem.png')"
                overlay.style.left = 0 + "em"
                overlay.style.top = 0 + "em"
                g.element.appendChild(overlay)
                game.bad_count++
            }

            if (game.level >= 2 && game.bad_count < max_bad) {
                game.next_bomb--
            }

            if (game.level >= 4 && game.bad_count < max_bad) {
                game.next_lock--
                if (
                    game.next_lock <= 0 &&
                    game.next_bomb > 0 &&
                    !game.doom_spawning &&
                    !game.bad_block
                ) {
                    const lock_min = [
                        7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1,
                    ]
                    const lock_max = [
                        15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 6, 6,
                        6, 5,
                    ]
                    game.next_lock =
                        lock_min[Math.min(game.level, 21) - 4] +
                        Math.floor(
                            Math.random() *
                                (lock_max[Math.min(game.level, 21) - 4] -
                                    lock_min[Math.min(game.level, 21) - 4] +
                                    1),
                        )

                    let x = Math.floor(Math.random() * 8)
                    let y = Math.floor(Math.random() * 8)
                    let g = find_gem(x, y)
                    while (g.type !== 0 || g.color === 7) {
                        x = Math.floor(Math.random() * 8)
                        y = Math.floor(Math.random() * 8)
                        g = find_gem(x, y)
                    }
                    g.type = 6
                    let overlay = document.createElement("DIV")
                    overlay.className = "gem_overlay"
                    overlay.style.backgroundImage =
                        "url('sprites/locking_gem.png')"
                    overlay.style.left = 0 + "em"
                    overlay.style.top = 0 + "em"
                    g.element.appendChild(overlay)
                    game.bad_count++
                }
            }
        }

        let matches = find_matches()

        let horizontals = matches.filter(m => !m[2])
        let verticals = matches.filter(m => m[2])
        let intersections = []
        for (const h of horizontals) {
            for (const v of verticals) {
                if (
                    v[0] >= h[0] &&
                    v[0] < h[0] + h[3] &&
                    h[1] >= v[1] &&
                    h[1] < v[1] + v[3]
                ) {
                    intersections.push({ point: [v[0], h[1]], h: h, v: v })
                }
            }
        }
        let count = matches.length - intersections.length

        game.cascades++
        if (game.cascades >= 2)
            document.getElementById("cascades").innerHTML =
                format_num(game.cascades) + " cascades"

        game.black_popped = 0
        let old_score = game.new_score > game.score
        const color = [
            "#ff192c",
            "#ff7919",
            "#ffc519",
            "#56ff19",
            "#19aaff",
            "#f719ff",
            "#ffffff",
        ]

        for (const match of matches) {
            if (intersections.some(i => i.v === match)) continue
            if (intersections.some(i => i.h === match)) continue

            let destruction = { score: 0 }
            let gems = []
            if (match[2]) {
                for (let i = 0; i < match[3]; i++) {
                    if (game.grid[match[0]][match[1] + i] !== null) {
                        gems.push(find_gem(match[0], match[1] + i))
                    }
                }
            } else {
                for (let i = 0; i < match[3]; i++) {
                    if (game.grid[match[0] + i][match[1]] !== null) {
                        gems.push(find_gem(match[0] + i, match[1]))
                    }
                }
            }
            gems.sort(function (a, b) {
                a.type - b.type
            })
            for (const g of gems) {
                if ((g.type >= 1 && g.type <= 5) || g.type === 7) {
                    remove_gem(g, destruction)
                } else {
                    remove_gem(g)
                }
            }

            if (match[3] === 4) {
                game.specials[0]++
                if (match[2]) {
                    new gem(match[0], match[1] + 2, match[4], 1)
                } else {
                    new gem(match[0] + 1, match[1], match[4], 1)
                }
            } else if (match[3] === 5) {
                game.specials[3]++
                if (match[2]) {
                    new gem(match[0], match[1] + 2, match[4], 4)
                } else {
                    new gem(match[0] + 2, match[1], match[4], 4)
                }
            }

            let score = 0
            if (match[3] >= 4) score += 100 * (match[3] - 3)
            else score += 50
            switch (game.cascades) {
                case 1:
                    break
                case 2:
                    score += 50
                    break
                case 3:
                    score += 100
                    break
                case 4:
                    score += 150
                    break
                default:
                    score += 100 * (game.cascades - 3)
                    break
            }
            if (destruction.score > 0) score += destruction.score
            if (count >= 3) score *= 3
            else if (count === 2) score *= 2

            game.new_score += score * game.boost
            if (game.new_score > 2 ** 53) game.new_score = 2 ** 53

            if (match[2]) {
                score_popup(
                    match[0],
                    match[1] + match[3] / 2 - 0.5,
                    score * game.boost,
                    color[match[4]],
                )
            } else {
                score_popup(
                    match[0] + match[3] / 2 - 0.5,
                    match[1],
                    score * game.boost,
                    color[match[4]],
                )
            }

            game.level_progress += Math.floor(10 * (score * game.boost) ** 0.4)
            document.getElementById("level_progress").style.width =
                32 * Math.min(game.level_progress / game.level_goal, 1) + "em"
        }

        for (const match of intersections) {
            let destruction = { score: 0 }
            let gems = []
            for (let i = 0; i < match.h[3]; i++) {
                if (game.grid[match.h[0] + i][match.h[1]] !== null) {
                    gems.push(find_gem(match.h[0] + i, match.h[1]))
                }
            }
            for (let i = 0; i < match.v[3]; i++) {
                if (
                    game.grid[match.v[0]][match.v[1] + i] !== null &&
                    (match.point[0] !== match.v[0] ||
                        match.point[1] !== match.v[1] + i)
                ) {
                    gems.push(find_gem(match.v[0], match.v[1] + i))
                }
            }
            gems.sort(function (a, b) {
                a.type - b.type
            })
            for (const g of gems) {
                if ((g.type >= 1 && g.type <= 5) || g.type === 7) {
                    remove_gem(g, destruction)
                } else {
                    remove_gem(g)
                }
            }

            game.specials[1]++
            new gem(match.point[0], match.point[1], match.h[4], 2)

            let score = 0
            if (match.h[3] >= 4) score += 100 * (match.h[3] - 3)
            else score += 50
            if (match.v[3] >= 4) score += 100 * (match.v[3] - 3)
            else score += 50
            switch (game.cascades) {
                case 1:
                    break
                case 2:
                    score += 100
                    break
                case 3:
                    score += 200
                    break
                case 4:
                    score += 300
                    break
                default:
                    score += 200 * (game.cascades - 3)
                    break
            }
            if (destruction.score > 0) score += destruction.score
            if (count >= 3) score *= 3
            else if (count === 2) score *= 2
            score = Math.round((score * 1.5) / 10) * 10

            game.new_score += score * game.boost
            if (game.new_score > 2 ** 53) game.new_score = 2 ** 53

            score_popup(
                match.point[0],
                match.point[1],
                score * game.boost,
                color[match.h[4]],
            )

            game.level_progress += Math.floor(10 * (score * game.boost) ** 0.4)
            document.getElementById("level_progress").style.width =
                32 * Math.min(game.level_progress / game.level_goal, 1) + "em"
        }

        if (game.new_score > game.score) {
            game.old_score = game.score
            game.score_ticks = 0
            if (!old_score) window.setTimeout(animate_score, 20)
        }

        if (game.cascades === 1) {
            game.boost_progress++
            while (game.boost_progress >= game.boost_goal) {
                game.boost_progress -= game.boost_goal
                game.boost++
                game.boost_goal = game.boost * 4
                if (game.boost >= 13) document.getElementById("boost_progress").style.gap = "0em"
                else if (game.boost >= 7) document.getElementById("boost_progress").style.gap = "0.125em"
                else document.getElementById("boost_progress").style.gap = "0.25em"

                for (let i = 1; i <= 4; i++) {
                    cell = document.createElement("DIV")
                    cell.className = "boost_cell unfilled"
                    cell.id = "cell" + (i + game.boost * 4 - 4)
                    document.getElementById("boost_progress").appendChild(cell)
                }
                document.getElementById("boost").innerHTML =
                    "x" + format_num(game.boost)
            }
            for (let i = 1; i <= game.boost_goal; i++) {
                if (game.boost_progress >= i)
                    document.getElementById("cell" + i).className =
                        "boost_cell filled"
                else
                    document.getElementById("cell" + i).className =
                        "boost_cell unfilled"
            }
        }

        window.setTimeout(cascade, 1000 / game.tickspeed)
    } else {
        let bomb_exploded = false
        for (const g of gem.list) {
            if (g.type === 5) {
                if (g.color === 7) {
                    if (g.timer <= 0) {
                        game.lives = 0
                        document.getElementById("lives").innerHTML = ""
                        g.element.remove()
                        game.grid[g.x][g.y] = null
                        gem.list = gem.list.filter(object => object !== g)

                        bomb_exploded = true
                        break
                    }
                } else {
                    if (g.timer <= 0) {
                        game.lives--
                        switch (game.lives) {
                            case 0:
                                document.getElementById("lives").innerHTML = ""
                                break
                            case 1:
                                document.getElementById("lives").innerHTML = "❤"
                                break
                            case 2:
                                document.getElementById("lives").innerHTML =
                                    "❤❤"
                                break
                        }
                        if (game.lives > 0) {
                            game.boost_progress = 0
                            for (let i = 1; i <= game.boost_goal; i++) {
                                document.getElementById("cell" + i).className =
                                    "boost_cell unfilled"
                            }
                            for (let i = 0; i < 3; i++) {
                                if (game.boost > 1) {
                                    game.boost--
                                    for (let i = 1; i <= 4; i++) {
                                        document
                                            .getElementById(
                                                "cell" + (i + game.boost * 4),
                                            )
                                            .remove()
                                    }
                                    game.boost_goal = game.boost * 4
                                } else break
                            }
                            if (game.boost >= 13) document.getElementById("boost_progress").style.gap = "0em"
                            else if (game.boost >= 7) document.getElementById("boost_progress").style.gap = "0.125em"
                            else document.getElementById("boost_progress").style.gap = "0.25em"
                            document.getElementById("boost").innerHTML =
                                "x" + format_num(game.boost)
                            for (const h of gem.list) {
                                if (h.x !== g.x || h.y !== g.y) {
                                    if (h.type === 5) {
                                        h.timer += 6
                                        if (h.color === 7) {
                                            h.digits[0].style.backgroundImage =
                                                "url('sprites/doom_timers/" +
                                                (Math.floor(
                                                    Math.max(h.timer, 0) / 10,
                                                ) %
                                                    10) +
                                                "0.png')"
                                            h.digits[1].style.backgroundImage =
                                                "url('sprites/doom_timers/" +
                                                (Math.max(h.timer, 0) % 10) +
                                                ".png')"
                                        } else {
                                            h.digits[0].style.backgroundImage =
                                                "url('sprites/bomb_timers/" +
                                                (Math.floor(
                                                    Math.max(h.timer, 0) / 10,
                                                ) %
                                                    10) +
                                                "0.png')"
                                            h.digits[1].style.backgroundImage =
                                                "url('sprites/bomb_timers/" +
                                                (Math.max(h.timer, 0) % 10) +
                                                ".png')"
                                        }
                                    }
                                }
                            }
                        }
                        g.element.remove()
                        game.grid[g.x][g.y] = null
                        gem.list = gem.list.filter(object => object !== g)

                        bomb_exploded = true
                        break
                    }
                }
            }
        }

        if (bomb_exploded) {
            if (game.lives >= 1) {
                window.setTimeout(cascade, 1000 / game.tickspeed)
            } else {
                clear_grid()
                document.getElementById("level_end").style.display = "block"
                document.getElementById("level_end").innerHTML =
                    "GAME&nbsp;OVER"
                game.status = "gameover"
                document.getElementById("gem_grid").className = "status_other"

                window.setTimeout(load_highscores, 6000 / game.tickspeed)
            }
        } else {
            if (game.cascades === 0) {
                if (game.boost_progress > 0 || game.pending_progress > 0) {
                    game.boost_progress = 0
                    game.pending_progress = 0

                    for (let i = 1; i <= game.boost_goal; i++) {
                        document.getElementById("cell" + i).className =
                            "boost_cell unfilled"
                    }
                } else {
                    if (game.boost > 1) {
                        game.boost--
                        for (let i = 1; i <= 4; i++) {
                            document
                                .getElementById("cell" + (i + game.boost * 4))
                                .remove()
                        }
                    }
                    game.boost_goal = game.boost * 4
                    if (game.boost >= 13) document.getElementById("boost_progress").style.gap = "0em"
                    else if (game.boost >= 7) document.getElementById("boost_progress").style.gap = "0.125em"
                    else document.getElementById("boost_progress").style.gap = "0.25em"
                }

                document.getElementById("boost").innerHTML =
                    "x" + format_num(game.boost)

                game.bad_block = false

                for (const g of gem.list) {
                    if (g.type === 5 && g.color === 7) {
                        g.timer--
                        g.digits[0].style.backgroundImage =
                            "url('sprites/doom_timers/" +
                            (Math.floor(Math.max(g.timer, 0) / 10) % 10) +
                            "0.png')"
                        g.digits[1].style.backgroundImage =
                            "url('sprites/doom_timers/" +
                            (Math.max(g.timer, 0) % 10) +
                            ".png')"
                    }
                }

                game.status = "idle"
                document.getElementById("gem_grid").className = "status_idle"
            } else if (game.cascades >= 1) {
                if (game.gems_destroyed >= 8) game.bad_block = true
                else game.bad_block = false
                game.cascades = 0
                game.gems_destroyed = 0

                if (game.level_progress >= game.level_goal) {
                    game.status = "levelup"
                    document.getElementById("gem_grid").className =
                        "status_other"
                    window.setTimeout(level_up, 2000 / game.tickspeed)
                } else {
                    game.status = "idle"
                    document.getElementById("gem_grid").className =
                        "status_idle"
                }
            }
        }
    }
}

function cascade() {
    game.status = "cascade"
    document.getElementById("gem_grid").className = "status_other"

    for (let i = 0; i < 8; i++) {
        for (let j = 6; j >= 0; j--) {
            if (game.grid[i][j] !== null && game.grid[i][j + 1] === null) {
                let g = find_gem(i, j)
                g.y++
                g.element.style.top = 4 * g.y + "em"

                game.grid[i][j + 1] = game.grid[i][j]
                game.grid[i][j] = null
            }
        }
    }

    if (game.next_bomb <= 0 && !game.doom_spawning && !game.bad_block) {
        const bomb_min = [
            4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1,
        ]
        const bomb_max = [
            12, 11, 10, 9, 9, 8, 8, 7, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3,
        ]
        game.next_bomb =
            bomb_min[Math.min(game.level, 21) - 2] +
            Math.floor(
                Math.random() *
                    (bomb_max[Math.min(game.level, 21) - 2] -
                        bomb_min[Math.min(game.level, 21) - 2] +
                        1),
            )

        let places = []
        for (let i = 0; i < 8; i++) {
            if (game.grid[i][0] === null) places.push(i)
        }
        for (let i = places.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[places[i], places[j]] = [places[j], places[i]]
        }
        for (let i = 0; i < places.length; i++) {
            if (i === 0) {
                new gem(places[i], 0, Math.floor(Math.random() * 7), 5)
                game.bad_count++
            } else {
                new gem(places[i], 0)
            }
        }
    } else {
        for (let i = 0; i < 8; i++) {
            if (game.grid[i][0] === null) new gem(i, 0)
        }
    }

    let empty = 0
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (game.grid[i][j] === null) empty++
        }
    }

    if (empty > 0) {
        window.setTimeout(cascade, 1000 / game.tickspeed)
    } else {
        window.setTimeout(match_check, 1000 / game.tickspeed)
    }
}

function animate_score() {
    game.score_ticks++
    if (game.score_ticks <= 33) {
        game.score =
            game.old_score +
            (game.new_score - game.old_score) *
                Math.sin((Math.PI / 2) * (game.score_ticks / 33) ** 0.5)
        window.setTimeout(animate_score, 20)
    }
    document.getElementById("score").innerHTML = format_num(
        Math.round(game.score),
    )
}

function level_up() {
    game.level++
    game.level_progress = 0
    if (game.level < 13) game.level_goal = 1450 + 500 * game.level + 50 * game.level ** 2
    else game.level_goal = game.level * 1750 - 6350
    document.getElementById("level_progress").style.width =
        32 * (game.level_progress / game.level_goal) + "em"

    let min = Math.min(16, 35 - game.level)
    game.next_black = 1 + Math.floor(Math.random() * min * 3)
    game.black_count = 0
    const bomb_min = [
        4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1,
    ]
    const bomb_max = [
        12, 11, 10, 9, 9, 8, 8, 7, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3,
    ]
    game.next_bomb = Math.max(Math.floor((bomb_min[Math.min(game.level, 21) - 2] + bomb_max[Math.min(game.level, 21) - 2]) / 2), 3)
    const lock_min = [
        7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1,
    ]
    const lock_max = [
        15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 6, 6, 6, 5,
    ]
    game.next_lock = Math.max(Math.floor((lock_min[Math.min(game.level, 21) - 4] + lock_max[Math.min(game.level, 21) - 4]) / 2), 5)
    game.doom_goal =
        game.level_goal * 0.2 +
        Math.floor(Math.random() * game.level_goal * 0.4 + 1)
    game.doom_spawned = false
    game.doom_spawning = false
    game.bad_count = 0
    game.bad_block = false

    clear_grid()
    document.getElementById("level_end").style.display = "block"
    document.getElementById("level_end").innerHTML =
        "LEVEL " + format_num(game.level - 1) + "<br>COMPLETE"

    window.setTimeout(function () {
        initialize_board()
        document.getElementById("level_end").style.display = "none"
        document.getElementById("level").innerHTML =
            "LEVEL " + format_num(game.level)
        game.status = "idle"
        document.getElementById("gem_grid").className = "status_idle"
    }, 6000 / game.tickspeed)
}

for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
        tile = document.createElement("DIV")
        if ((i + j) % 2 === 0) tile.className = "grid_tile even"
        else tile.className = "grid_tile odd"
        document.getElementById("gem_grid").appendChild(tile)
    }
}

function initialize_board() {
    if (gem.list.length > 0) {
        clear_grid()
    }
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            new gem(i, j)
        }
    }

    let fails = 0
    while (match_exists()) {
        fails++
        clear_grid()
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                new gem(i, j)
            }
        }
    }

    console.log(fails)

    for (let i = 0; i < 4; i++) {
        if (game.specials[i] >= 1) {
            for (let j = 0; j < game.specials[i]; j++) {
                let x = Math.floor(Math.random() * 8)
                let y = Math.floor(Math.random() * 8)
                let g = find_gem(x, y)

                while (g.color >= 6 || g.type !== 0) {
                    x = Math.floor(Math.random() * 8)
                    y = Math.floor(Math.random() * 8)
                    g = find_gem(x, y)
                }

                g.type = i + 1
                let overlay = document.createElement("DIV")
                overlay.className = "gem_overlay"
                switch (i) {
                    case 0:
                        overlay.style.backgroundImage =
                            "url('sprites/flame_gem.png')"
                        break
                    case 1:
                        overlay.style.backgroundImage =
                            "url('sprites/lightning_gem.png')"
                        break
                    case 3:
                        overlay.style.backgroundImage =
                            "url('sprites/hypercube_gem.png')"
                        break
                }
                overlay.style.left = 0 + "em"
                overlay.style.top = 0 + "em"
                g.element.appendChild(overlay)
            }
        }
    }
}

initialize_board()

let highscores = JSON.parse(localStorage.getItem("jewel_simulator_highscores"))
if (highscores === null) {
    highscores = Array.from({ length: 10 }, () => [1, 0])
}

function load_highscores() {
    document.getElementById("game_panel").style.display = "none"
    document.getElementById("highscore_panel").style.display = "block"

    let placement = 10
    for (let i = 9; i >= 0; i--) {
        if (game.score > highscores[i][1]) {
            placement = i
        } else break
    }

    if (placement < 10) {
        for (i = 9; i > placement; i--) {
            highscores[i][0] = highscores[i - 1][0]
            highscores[i][1] = highscores[i - 1][1]
        }
        highscores[placement][0] = game.level
        highscores[placement][1] = game.score
    }

    let str = ""
    for (let i = 0; i < 10; i++) {
        if (str !== "") str += "<br>"
        if (placement === i) str += '<span class="your_score">'
        str += "#" + (i + 1)
        str += " - LEVEL " + format_num(highscores[i][0])
        str += " - " + format_num(highscores[i][1])
        if (placement === i) str += "</span>"
    }
    document.getElementById("highscores").innerHTML = str

    localStorage.setItem(
        "jewel_simulator_highscores",
        JSON.stringify(highscores),
    )

    document.getElementById("level_progress").style.width =
        0 + "em"
}

function new_game() {
    if (game.boost >= 2) {
        for (let i = 5; i <= game.boost_goal; i++) {
            document
                .getElementById(
                    "cell" + (i + game.boost * 4),
                )
                    .remove()
        }
    }
    
    game = {
        tickspeed: 3,
        status: "idle",
        drag: [null, null],

        level: 1,
        level_goal: 2000,
        level_progress: 0,

        lives: 3,

        boost: 1,
        boost_goal: 4,
        boost_progress: 0,

        score: 0,
        old_score: 0,
        new_score: 0,
        score_ticks: 0,
        cascades: 0,
        gems_destroyed: 0,

        grid: new Array(8),
        specials: [0, 0, 0, 0],
        next_black: 1 + Math.floor(Math.random() * 105),
        black_count: 0,
        black_popped: 0,
        next_bomb: 8,
        next_lock: 10,
        doom_goal: 400 + Math.floor(Math.random() * 801),
        doom_spawned: false,
        doom_spawning: false,
        bad_count: 0,
        bad_block: false,
    }

    for (let i = 0; i < 8; i++) {
        game.grid[i] = new Array(8).fill(null)
    }

    document.getElementById("game_panel").style.display = "block"
    document.getElementById("highscore_panel").style.display = "none"
    document.getElementById("level_end").style.display = "none"

    document.getElementById("level").innerHTML =
        "LEVEL " + format_num(game.level)
    document.getElementById("lives").innerHTML = "❤❤❤"
    for (let i = 1; i <= game.boost_goal; i++) {
        document.getElementById("cell" + i).className =
            "boost_cell unfilled"
    }

    initialize_board()
}
