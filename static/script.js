function render_card(card) {
	let c = document.createElement("div");
	c.classList.add("card");
	c.setAttribute("data-card", JSON.stringify(card));
	c.classList.add("color-"+card.color.toLowerCase());
	c.innerHTML = card.number;
	if (Object.keys(game.given_hints).includes(card.uuid)) {
		game.given_hints[card.uuid].forEach(hint => {
			if (hint.hasOwnProperty("Color")) {
				c.classList.add("hinted-color");
			}
			if (hint.hasOwnProperty("Number")) {
				c.classList.add("hinted-number");
			}
		});
	}
	return c;
}

function render_game(game) {
	$("#hints").empty();
	for (i=0; i<game.hints; i++) {
		$("#hints").append("<img class='token' draggable='false' src='/time_token.png'/>");
	}
	$("#fuses").css("background-image", "url('/fuse" + game.fuses + ".png')").css("background-size", "80px 80px").css("flex-shrink", "0").html((game.fuses > 0) ? game.fuses : "");
	$("#discard").empty();
	game.discard.forEach(function(item, index) {
		$("#discard").append(render_card(item));
	});
	$("#deck").html(game.deck.length);
	game.players.forEach(function(item, player) {
		let tray = $("#players").first().children().eq(player).find(".cardrack");
		let cards = item.cards.map((x) => (render_card(x)));
		if (player == playerNumber() && game.fuses > 0 && game.endgame_turns > 0) {
			//tray.sortable()
			cards.forEach(function(card) {
				$(card).draggable({
					"revert": "invalid",
					"zIndex": 100,
					//"connectToSortable": tray,
				});
			});
		} else {
			tray.addClass("player-other");
		}
		tray.empty();
		cards.forEach((card) => (tray.prepend(card)));
	});
	Object.entries(game.played).forEach(function(item, index) {
		let color = ".color-" + item[0].toLowerCase();
		$("#played > .cardrack").find(color).html(item[1]).show();
	});
	$("#hintplayer").empty();
	if (game.players.length > 2) {
		$("#hintplayer").append("<option>—</option>")
	}
	game.player_names.forEach(function(item, index) {
		let name = $("#players").first().children().eq(index).find(".playername");
		name.removeClass("activeplayer");
		name.html(item);
		if (index == game.turn) {
			name.addClass("activeplayer");
		}
		if (index != playerNumber()) {
			$("#hintplayer").append("<option value='"+item+"'>"+item+"</option>")
		}
	});
	$("#gamelog").empty();
	game.moves.forEach(function(item, index) {
		let msg = "<li>" + game.player_names[item.player] + " ";
		if (item.turn.hasOwnProperty("Hint")) {
			const number_to_word = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
			msg += "hinted " + game.player_names[item.turn.Hint[0].player] + " " + number_to_word[item.turn.Hint[1]] + " <b>";
			if (item.turn.Hint[0].data.hasOwnProperty("Number")) {
				msg += item.turn.Hint[0].data.Number;
			} else if (item.turn.Hint[0].data.hasOwnProperty("Color")) {
				msg += item.turn.Hint[0].data.Color;
			}
			if (item.turn.Hint[1] > 1) {
				msg += "s";
			}
			msg += "</b>";
		} else if (item.turn.hasOwnProperty("Play")) {
			msg += "played <b>" + item.turn.Play[0].color + " " + item.turn.Play[0].number + "</b>";
			if (!item.turn.Play[1]) {
				msg += ", and set off a fuse :(";
			}
		} else if (item.turn.hasOwnProperty("Discard")) {
			msg += "discarded <b>" + item.turn.Discard.color + " " + item.turn.Discard.number + "</b>";
		}
		msg += "</li>";
		$("#gamelog").append(msg);
	});
	if (game.fuses == 0 || game.endgame_turns == 0) {
		let ding3 = new Audio("/3ding.mp3");
		ding3.play();
		let msg = "<li>game over: "
		if (getScore() <= 5) {
			msg += "horrible, booed by the crowd...";
		} else if (getScore() <= 10) {
			msg += "mediocre, just a hint of scattered applause...";
		} else if (getScore() <= 15) {
			msg += "honorable attempt, but quickly forgotten...";
		} else if (getScore() <= 20) {
			msg += "excellent, crowd pleasing.";
		} else if (getScore() <= 24) {
			msg += "amazing, they will be talking about it for weeks!";
		} else if (getScore() == 25) {
			msg += "legendary, everyone left speechless, stars in their eyes!";
		}
		msg += " (" + getScore() + ")</li>";
		$("#gamelog").append(msg);
	}
	$("#gamelog").scrollTop($("#gamelog")[0].scrollHeight);
}

function getScore() {
	return Object.values(game.played).reduce((a, b) => (a + b), 0);
}

function playerNumber() {
	let num = game.player_names.indexOf(name);
	if (typeof num == "undefined") {
		return -1;
	} else {
		return num;
	}
}

function isMyTurn() {
	return playerNumber() == game.turn;
}

let gameid = undefined;
let name = undefined;
let game = undefined;

function refreshGame() {
	$.get("/api/" + gameid + "/gamedata", function(data) {
		if (JSON.stringify(game) != JSON.stringify(data)) {
			if (
				typeof game != "undefined" &&
				game.turn != data.turn &&
				data.turn == playerNumber() &&
				!(game.fuses == 0 || game.endgame_turns == 0)
			) {
				let ding = new Audio("/ding.mp3");
				ding.play();
			}
			game = data;
			render_game(data);
			$("#gridwrapper").show();
		}
	});
}

function discardCard(card) {
	let play = {
		"player": playerNumber(),
		"turn": {"Discard": card},
	};
	$.post("/api/" + gameid + "/play", data = JSON.stringify(play), refreshGame);
}

function playCard(card) {
	let play = {
		"player": playerNumber(),
		"turn": {"Play": card},
	};
	$.post("/api/" + gameid + "/play", data = JSON.stringify(play), refreshGame);
}

function giveHint(hint) {
	let player = game.player_names.indexOf($("#hintplayer").val());
	let data = undefined;
	if (typeof hint == "number") {
		data = {"Number": hint};
	} else if (typeof hint == "string") {
		data = {"Color": hint};
	}
	let play = {
		"player": playerNumber(),
		"turn": {
			"Hint": {
				"player": player,
				"data": data
			},
		},
	};
	$.post("/api/" + gameid + "/play", data = JSON.stringify(play), refreshGame);
}

$(document).ready(function() {
	name = window.prompt("what's your name?");

	gameid = window.location.pathname.split("/").slice(-1)[0];

	if (name != null) {
		$.post("/api/" + gameid + "/join/"+name);
	}

	$("#discard").droppable({
		accept: isMyTurn,
		tolerance: "fit",
		drop: function(e, ui) {
			discardCard(JSON.parse(ui.draggable.attr("data-card")));
			ui.draggable.remove();
		}
	});

	$("#played").droppable({
		accept: isMyTurn,
		tolerance: "intersect",
		drop: function(e, ui) {
			playCard(JSON.parse(ui.draggable.attr("data-card")));
			ui.draggable.remove();
		}
	});

	window.setInterval(function(){
		if ($(".ui-draggable-dragging").length == 0 || typeof game == "undefined") {
			refreshGame();
		}
	}, 1000);
});
