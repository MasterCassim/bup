event
=====

matches*        A list of matches to be played (see below)
preferred_order Array of eventsheet_id (recommended) or match_name values that indicate the best order of matches as set by the tournament organizers.
                Example: ["MS1", "WS", "MS2", "MD1", "WD", "MD2", "MX"].
league_key      ID of the league being played (this determines which event sheets are available, among others).
                Strongly recommended if applicable.
                Available values: "1bl-2015", "2bln-2015", "2bls-2015", "1bl-2016", "2bln-2016", "2bls-2016", "RLW", "RLN"
team_names      Array of home and away team name. Required for team competitions.
                Example: ["TV Refrath", "BC Bischmisheim"]
id              Globally unique event id, e.g. "2016-bundesliga-refrath vs bischmisheim"
location        Location name and address as a string, e.g. "SpH Steinbreche"
protest         Text describing the protest of one team, e.g. "Court extremely slippery (Home team, 19:00)"
umpires         String describing umpires (for eventsheet), e.g. "Barbara Bub & Klaus-Michael Becker"
starttime       Human-readable official start time, e.g. "19:00"
matchday        Match day according to league plan, e.g. "1" (first game of the season) or "semi-finals"
notes           Non-protest notes, e.g. "Bundesliga logo missing on front of information sheet"
backup_players  2-element list (home/away), each element is another list of all the players (see below).
                gender key required for each player.
all_players     2-element list (home/away), each element is a list of all players that can play for the team.
                gender key required for each player.
teamsters       2-element list (home/away). Name (as string) of the teamsters of each team.
                Depending on regulation, not necessarily (active) players.
                Example: ["Heinz Kelzenberg", "Michael Fuchs"]
courts          An array describing the current configuration of courts.


court
=====

court_id*     ID of this court (often 1, 2, 3..)
description   Description of where this court is.
match_id      The match_id property of the match currently being played on this court.
chair         "west" - Umpire chair to the west at displaymode, "east" - Umpire chair to the east of the displaymode.


match
=====

setup*        All properties that don't change during the match
presses       Array of press, contains all button presses in the match so far.
presses_json  JSON encoding of presses (in order to not construct a large number of objects)
network_score The score displayed in the network system (may be different to actual score in case of retiring or disqualification).
              A list of 2-element lists, e.g. [[21, 19], [29, 30], [15, 4]]. First element is home team, second away team.
incomplete    Boolean. If set than the match is not yet ready to be called,
              for instance because no players have been assigned yet.


press
=====

team_id is always 0: home team, 1: away_team.
player_id is the index into the players array of setup.teams (0 in singles).

timestamp*       UNIX timestamp when the button was pressed.
type*            What kind of button has been pressed. Determines the other keys.
 "pick_side"     Who plays on which side.
    team1_left*    (true: home team left, false: home team right)
 "pick_server"   Who is serving.
    team_id*
    player_id*
 "pick_receiver" Who is receiving (optional in singles).
    team_id*
    player_id*
 "love-all"      Start of match time (end of initial announcement)
 "postgame-confirm"  Confirmation after announcement at end of game
 "postmatch-confirm" Confirmation after announcement at end of match
 "score"         A normal rally has been won.
 	  side*          Either "left" or "right", depending on who won the rallye.
 "overrule"      Line judge has been overruled (O in scoresheet)
 "referee"       Referee has been called (R in scoresheet)
 "correction"    Incorrect server/receiver has been corrected (C in scoresheet)
    team_id*       0: home team was incorrect, 1: away team was incorrect
 "yellow-card"   Warning for misconduct (yellow card).
    team_id*
    player_id*
 "red-card"      Fault for misconduct (red card).
    team_id*
    player_id*
 "injury"        A player has been injured (I on scoresheet, timer will run)
    team_id*
    player_id*
 "injury-resume" Play resumes after an injury
 "retired"       Player resigns. ("Retired" on scoresheet)
    team_id*
    player_id*
 "disqualified"  Black card. ("Disqualified" on scoresheet)
    team_id*
    player_id*
 "suspension"   Interruption of game, e.g. due to power failure. ("S" on scoresheet)
 "resume"       Resume play after interruption. Duration will be recorded on scoresheet.
 "shuttle"      Shuttlecock given out to the players. Total count will be recorded on scoresheet.
 "editmode_change-ends"  Manual change of ends during the match.
 "editmode_switch-sides" Manual change of who's playing left and who's right.
    team_id*
 "editmode_change-serve" Manual change of which side is serving.
 "editmode_set-score"    Manual edit of the current score.
    by_side*      Boolean, determines the format of score.
    score*        The new score of the current game.
                  If by_side then {left: 19, right: 18}.
                  Otherwise [19, 18], where the first value is the home team's score.
 "editmode_set-finished_games" Manual change of the scores of past games.
                               Can also be used to invent or ignore past games.
    by_side*      Boolean, determines the format of score.
    scores*       An array of the scores of the past games.
                  If by_side then [{left: 19, right: 18}].
                  Otherwise [[19, 18]], where the first value of each subarray is the home team's score.
                  Number of items can be different from actual number of sets.
                  For instance, to start at 21:19 18:21 in the third game right away, call with
                  scores: [[21, 19], [18, 21]].
 "timer_restart" Restart the current (interval/warmup) timer.
 "note"          A plain-text note on the scoresheet.
    val*          Human-readable string of what happened.

match setup
===========

eventsheet_id      Language-independent ID of the match describing match type and number, e.g. "MS1".
                   If missing match_name will be used.
match_name*        Human-readable name of the match, e.g. "1. MS"
match_id*          (Globally) unique ID, e.g. "20160825-Bundesliga-finale-MS1"
teams*             An array (0: home team, 1: away team) of teams (see below).
is_doubles*        Boolean key. false => singles, true => mixed/doubles
counting*          Scoring system. Valid values are "3x21", "1x21", "2x21+11", "5x11_15", "1x11_15", "5x11/3"
team_competition*  Are players competing for their teams(true) or for themselves(false)? Affects announcements
event_name         Name of the event (will be present on scoresheet), e.g. "Finals"
tournament_name    Name of the overall tournament (will be present on scoresheet), e.g. "Bundesliga 2015/2016"
umpire_name        Name of the umpire assigned to this match (or the last one who touched it).
service_judge_name Name of the service judge assigned to this match.
court_id           ID of the court this match is played on.

team
====

name     The team, club, or country name the player is competing for, e.g. "TV Refrath".
         Required when team_competition is set in match setup.
players* Array of players (1 element in singles, 2 in doubles/mixed).
         Each element of that array is a player object (see below).

player
======

firstname Given name. If present lastname must be present as well.
gender    "m" or "f". If missing this is guessed by eventutils.guess_gender.
lastname  Surname. If present firstname must be set as well.
name*     Full name of the player


* required key