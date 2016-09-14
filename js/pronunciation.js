var pronunciation = (function() {
'use strict';

function match_str(setup) {
	if (setup.is_doubles) {
		return setup.teams[0].players[0].name + '/' + setup.teams[0].players[1].name + ' vs ' + setup.teams[1].players[0].name + '/' + setup.teams[1].players[1].name;
	} else {
		return setup.teams[0].players[0].name + ' vs ' + setup.teams[1].players[0].name;
	}
}

// Team name as presented to the umpire
function teamtext_internal(s, team_id) {
	var player_names;
	if (s.setup.is_doubles) {
		player_names = (
			s.setup.teams[team_id].players[0].name + ' / ' +
			s.setup.teams[team_id].players[1].name);
	} else {
		player_names = s.setup.teams[team_id].players[0].name;
	}

	if (s.setup.team_competition) {
		return s.setup.teams[team_id].name + ' (' + player_names + ')';
	} else {
		return player_names;
	}
}

// Simplified announcement for minimal buttons
function loveall_announcement(s) {
	var glen = s.match.finished_games.length;
	var game_id = (s.match.max_games - 1 === glen) ? 'final' : glen;
	return s._('loveall_play.' + game_id, {
		mark_extra: '',
		score: _pronunciation_score(s),
	});
}

function wonby_name(s, winner_idx) {
	var winner = s.setup.teams[winner_idx];

	if (s.setup.team_competition) {
		return winner.name;
	} else {
		if (s.setup.is_doubles) {
			return winner.players[0].name + s._('wonby.and') + winner.players[1].name;
		} else {
			return winner.players[0].name;
		}
	}
}

function postgame_announcement(s) {
	var winner_index = s.game.team1_won ? 0 : 1;
	var winner_score = s.game.score[winner_index];
	var loser_score = s.game.score[1 - winner_index];
	var winner_name = wonby_name(s, winner_index);

	var res = '';
	if (s.match.finished) {
		res = s._('wonby.match', {
			winner_name: winner_name,
			score_str: calc.score_str(s, winner_index),
		});
	} else {
		var is_individual_doubles = s.setup.is_doubles && !s.setup.team_competition;
		var gscore = calc.gamescore(s);
		var games_leader_idx = (gscore[0] > gscore[1]) ? 0 : 1;
		var games_leader_name = wonby_name(s, games_leader_idx);
		res = s._('wonby.' + (gscore[0] + gscore[1]), {
			winner_name: winner_name,
			winner_score: winner_score,
			loser_score: loser_score,
		}) + s._('gamescore.' + (is_individual_doubles ? 'doubles.' : '') + gscore[games_leader_idx] + '-' + gscore[1 - games_leader_idx], {
			games_leader_name: games_leader_name,
		});
	}
	return res;
}

function _prematch_team(s, team_id) {
	var team = s.setup.teams[team_id];
	var res = '';
	if (s.setup.team_competition) {
		res = team.name + s._('onmyleft.representedby');
	}
	if (s.setup.is_doubles) {
		res += s._('onmyleft.team.doubles', {
			p1: team.players[0].name,
			p2: team.players[1].name,
		});
	} else {
		res += team.players[0].name;
	}
	if (team.name && !s.setup.team_competition) {
		res += ', ' + team.name;
	}
	return res;
}

function _pronunciation_score(s, score, team1_serving, service_over) {
	if (score === undefined) {
		score = s.game.score;
	}
	if (team1_serving === undefined) {
		team1_serving = s.game.team1_serving;
	}
	if (service_over === undefined) {
		service_over = s.game.service_over;
	}
	var first_score = score[team1_serving ? 0 : 1];
	var second_score = score[team1_serving ? 1 : 0];
	if (s.lang == 'en') {
		if (first_score === 0) {
			first_score = 'Love';
		}
		if (second_score === 0) {
			second_score = 'Love';
		}
	}
	var point_str = (s.game.gamepoint ? (' ' + s._('game point')) : (s.game.matchpoint ? (' ' + s._('match point')) : ''));
	var score_str = (
		(first_score == second_score) ?
		(first_score + point_str + ' ' + s._('score.all')) :
		(first_score + (point_str ? (point_str + ' ') : '-') + second_score)
	);
	var service_over_str = (service_over ? s._('score.service_over') : '');
	return service_over_str + score_str;
}

function marks2str(s, marks, during_interval) {
	var res = '';
	marks.forEach(function(mark) {
		var d = {};
		if ((mark.team_id !== undefined) && (mark.player_id !== undefined)) {
			d.player_name = s.setup.teams[mark.team_id].players[mark.player_id].name;
		}

		switch (mark.type) {
		case 'yellow-card':
			res += s._('card.yellow', d);
			break;
		case 'red-card':
			res += s._('card.red' + (during_interval ? '.interval' : ''), d);
			break;
		case 'disqualified':
			res += s._('card.black', d);
			break;
		case 'retired':
			res += s._('card.retired', d);
			break;
		}
	});
	return res;
}

function pronounce(s, now) {
	var timer_done = false;
	var timer_exigent = false;
	if (s.timer) {
		if (!now) {
			now = Date.now();
		}
		timer_done = now >= (s.timer.start + s.timer.duration);
		if (!timer_done && s.timer.exigent) {
			timer_exigent = now >= (s.timer.start + s.timer.duration - s.timer.exigent);
		}
	}

	var mark_str = marks2str(s, s.match.marks);

	if (s.match.suspended) {
		return s._('match suspended');
	}

	if (s.match.injuries) {
		var referee_called = s.match.marks.some(function(mark) {
			return mark.type == 'referee';
		});
		return mark_str + (referee_called ? '' : (s._('[Call referee!]') + '\n')) + s._('Are you retiring?');
	}

	if (s.match.announce_pregame && s.match.finished_games.length === 0) {
		var serving_team_id = s.game.team1_serving ? 0 : 1;
		var receiving_team_id = 1 - serving_team_id;

		var server_score_side = s.game.score[serving_team_id] % 2;
		var serving_player_id = s.game.teams_player1_even[serving_team_id] ? server_score_side : (1 - server_score_side);
		var receiving_player_id = s.game.teams_player1_even[receiving_team_id] ? server_score_side : (1 - server_score_side);

		var server_name = s.setup.teams[serving_team_id].players[serving_player_id].name;
		var receiver_name = s.setup.teams[receiving_team_id].players[receiving_player_id].name;

		var d; // Can't use let :(
		if (s.setup.team_competition) {
			var serving_str = (
				s.setup.is_doubles ?
				(s.setup.is_doubles ? (', ' + server_name + s._('onmyleft.serve.to') + receiver_name) : '') :
				''
			);
			d = {
				away_team: _prematch_team(s, 1),
				home_team: _prematch_team(s, 0),
				serving_team: s.setup.teams[serving_team_id].name,
				serving_str: serving_str,
				score: _pronunciation_score(s),
			};

			return (
				mark_str +
				s._(s.game.team1_left ? 'onmyleft.home_team' : 'onmyleft.away_team', d)
			);
		} else {
			var receiver_str = (s.setup.is_doubles ?
				s._('onmyleft.serveto', {receiver: receiver_name}) : '');

			d = {
				right_team: _prematch_team(s, (s.game.team1_left ? 1 : 0)),
				left_team: _prematch_team(s, (s.game.team1_left ? 0 : 1)),
				server: server_name,
				receiver_str: receiver_str,
				score: _pronunciation_score(s),
			};

			return mark_str + s._('onmyleft', d);
		}
	} else if (s.match.announce_pregame) {
		var glen = s.match.finished_games.length;
		var game_id_str = (s.match.max_games - 1 === glen) ? 'final' : glen;
		if (mark_str) {
			return s._('loveall_play.' + game_id_str + '.mark', {
				mark_str: marks2str(s, s.match.marks, true),
				score: _pronunciation_score(s),
			});
		} else {
			return s._('loveall_play.' + game_id_str, {
				score: _pronunciation_score(s),
			});
		}
	}

	if (s.game.finished) {
		var pre_mark_str = mark_str;
		var post_mark_str = '';
		if (s.game.final_marks) {
			pre_mark_str = marks2str(s, s.game.final_marks);
			var post_marks = s.match.marks.slice(s.game.final_marks.length);
			post_mark_str = marks2str(s, post_marks, true);
		}

		return (
			pre_mark_str +
			(s.game.won_by_score ? s._('game(won)') + '.\n' : '') +
			(post_mark_str ? (post_mark_str) : '') +
			postgame_announcement(s)
		);
	}

	if (s.match.just_unsuspended)  {
		return (
			mark_str + s._('ready to unsuspend') +
			_pronunciation_score(s, undefined, undefined, false) +
			s._('card.play')
		);
	}

	var score_str = _pronunciation_score(s);

	// No let in current browsers, therefore tucked in here
	var interval_pre_mark_str;
	var post_interval_marks;
	var interval_post_mark_str;

	if (!s.game.finished && s.game.started) {
		if ((s.game.score[0] === 0) && (s.game.score[1] === 0) && !mark_str) {
			return null;  // Special case at 0-0, we just showed the long text. Time to focus on the game.
		}

		var interval_str = '';
		if (s.game.interval) {
			if (timer_exigent) {
				var court_id = s.settings ? s.settings.court_id : null;
				if (court_id === 'referee') {
					court_id = null;
				}
				score_str = '';
				if (court_id) {
					interval_str += s._('20secs', {court_id: court_id});
				} else {
					interval_str += s._('20secs:nocourt');
				}
			} else if (timer_done) {
				score_str = '';
			} else {
				interval_str += ' ' + s._('Interval');
				if (s.game.change_sides) {
					interval_str += s._('change_ends');
				}
			}
			if (mark_str) {
				interval_pre_mark_str = marks2str(s, s.game.interval_marks);
				post_interval_marks = s.match.marks.slice(s.game.interval_marks.length);

				if (post_interval_marks.length > 0) {
					interval_post_mark_str = marks2str(s, post_interval_marks, true);
					if (interval_post_mark_str) {
						// Only use extended form if it's more than just a referee call
						var service_over_param = utils.deep_equal(s.game.interval_score, s.game.score) ? false : undefined;
						if (score_str) {
							score_str = _pronunciation_score(s, s.game.interval_score, s.game.interval_team1_serving, s.game.interval_service_over);
						}
						var res = (
							interval_pre_mark_str +
							score_str +
							interval_str);
						if (res) {
							res += '\n';
						}
						return (res +
							interval_post_mark_str +
							_pronunciation_score(s, undefined, undefined, service_over_param) +
							s._('card.play')
						);
					}
				}
			}
			if (interval_str) {
				interval_str += '\n';
			}
			interval_str += s._('postinterval.play', {
				score: _pronunciation_score(s, undefined, undefined, false),
			});
		} else if (s.game.just_interval) {
			if (mark_str) {
				interval_pre_mark_str = marks2str(s, s.game.interval_marks);
				post_interval_marks = s.match.marks.slice(s.game.interval_marks.length);
				if (post_interval_marks.length > 0) {
					interval_post_mark_str = marks2str(s, post_interval_marks, true);
				} else {
					interval_post_mark_str = '';
				}
				return interval_pre_mark_str + interval_post_mark_str + s._('postinterval.play', {
					score: _pronunciation_score(s, undefined, undefined, false),
				});
			} else {
				return null;  // Special case after interval, pronunciation has just been confirmed.	
			}
		}

		return mark_str + score_str + interval_str;
	}

	if (mark_str) {
		if (s.game.started && !s.game.finished) {
			return mark_str.trim();
		} else {
			return marks2str(s, s.match.marks, true).trim();
		}
	}

	return null;
}

return {
	pronounce: pronounce,
	loveall_announcement: loveall_announcement,
	postgame_announcement: postgame_announcement,
	match_str: match_str,
	teamtext_internal: teamtext_internal,
};

})();

/*@DEV*/
if (typeof module !== 'undefined') {
	var calc = require('./calc');
	var utils = require('./utils');

	module.exports = pronunciation;
}
/*/@DEV*/