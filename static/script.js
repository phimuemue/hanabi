function render_card(card) {
	let c = document.createElement("div");
	c.classList.add("card");
	c.setAttribute("data-card", JSON.stringify(card));
	let player_card = game.players[playerNumber()].cards.map(hand_card => hand_card.uuid == card.uuid).some(x => x);
	c.classList.add("color-unknown");
	c.innerHTML = "?";
	if (player_card && game.fuses > 0 && game.endgame_turns > 0) {
		$(c).draggable({"revert": "invalid"});
		if (Object.keys(game.given_hints).includes(card.uuid)) {
			game.given_hints[card.uuid].forEach(hint => {
				if (hint.hasOwnProperty("Color")) {
					c.classList.remove("color-unknown");
					c.classList.add("color-"+card.color.toLowerCase());
				}
				if (hint.hasOwnProperty("Number")) {
					c.innerHTML = card.number;
				}
			});
		}
	} else {
		c.classList.remove("color-unknown");
		c.classList.add("color-"+card.color.toLowerCase());
		c.innerHTML = card.number;
	}
	return c;
}

function render_game(game) {
	$("#hints").empty();
	for (i=0; i<game.hints; i++) {
		$("#hints").append("<img class='token' src='/time_token.png'/>");
	}
	$("#fuses").html("<img class='token' src='/fuse" + game.fuses + ".png'/>");
	$("#discard").empty();
	game.discard.forEach(function(item, index) {
		$("#discard").append(render_card(item));
	});
	$("#deck").html(game.deck.length);
	game.players.forEach(function(item, player) {
		let tray = $("#players").first().children().eq(player).find(".cardrack");
		tray.empty();
		item.cards.forEach(function(item, index) {
			let card = render_card(item);
			tray.prepend(card);
		});
	});
	Object.entries(game.played).forEach(function(item, index) {
		let color = ".color-" + item[0].toLowerCase();
		$("#played > .cardrack").find(color).html(item[1]);
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
			msg += "hinted " + game.player_names[item.turn.Hint.player] + " ";
			if (item.turn.Hint.data.hasOwnProperty("Number")) {
				msg += item.turn.Hint.data.Number;
			} else if (item.turn.Hint.data.hasOwnProperty("Color")) {
				msg += item.turn.Hint.data.Color;
			}
		} else if (item.turn.hasOwnProperty("Play")) {
			msg += "played " + item.turn.Play.color + " " + item.turn.Play.number;
		} else if (item.turn.hasOwnProperty("Discard")) {
			msg += "discarded " + item.turn.Discard.color + " " + item.turn.Discard.number;
		}
		msg += "</li>";
		$("#gamelog").append(msg);
	});
	if (game.fuses == 0 || game.endgame_turns == 0) {
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
}

function getScore() {
	return Object.values(game.played).reduce((a, b) => (a + b), 0);
}

function playerNumber() {
	return game.player_names.indexOf(name);
}

function isMyTurn() {
	return playerNumber() == game.turn;
}

let name = undefined;
let game = undefined;

function refreshGame() {
	$.get("/api/gamedata", function(data) {
		game = data;
		render_game(data);
	});
}

function discardCard(card) {
	let play = {
		"player": playerNumber(),
		"turn": {"Discard": card},
	};
	$.post("/api/play", data = JSON.stringify(play), refreshGame);
}

function playCard(card) {
	let play = {
		"player": playerNumber(),
		"turn": {"Play": card},
	};
	$.post("/api/play", data = JSON.stringify(play), refreshGame);
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
	$.post("/api/play", data = JSON.stringify(play), refreshGame);
}

$(document).ready(function() {
	name = window.prompt("what's your name?");

	if (name != null) {
		$.post("/api/join/"+name);
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
		tolerance: "fit",
		drop: function(e, ui) {
			playCard(JSON.parse(ui.draggable.attr("data-card")));
			ui.draggable.remove();
		}
	});

	window.setInterval(function(){
		if ($(".ui-draggable-dragging").length == 0 && (typeof game == "undefined" || !isMyTurn())) {
			refreshGame();
		}
	}, 1000);
});