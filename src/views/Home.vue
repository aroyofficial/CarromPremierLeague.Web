<template>
	<div id="home-page-container" class="px-5">
		<el-collapse v-model="activeNames">
			<el-collapse-item
				title="🏆 About the Carrom Premier League (CPL)"
				name="1"
			>
				<div>
					The Carrom Premier League (CPL) is a structured, competitive carrom
					tournament designed to bring together skill, strategy, and sporting
					spirit under one league platform.
				</div>
				<div>
					CPL is not just about pocketing coins - it is about composure under
					pressure, smart positioning, teamwork, and consistency across matches.
					Every team competes in a league format where performance across games
					determines their position on the table.
				</div>
				<div>
					With time-bound matches, shot-clock discipline, and a guaranteed
					winner in every game, CPL ensures fast-paced, result-driven encounters
					that keep both players and spectators engaged till the final strike.
				</div>
				<div>
					The tournament is governed by a transparent points system and clear
					tie-breaker rules to maintain fairness and competitiveness throughout
					the season.
				</div>
			</el-collapse-item>
			<el-collapse-item title="🎯 Match Format & Gameplay" name="2">
				<div>Each match in CPL is designed to be fast and decisive.</div>
				<div>
					<ul>
						<li>
							<b>Match Duration:</b> At the end of regulation time, the team
							with the higher number of pocketed coins will be declared the
							winner.
						</li>
						<li>
							<b>Extended Play:</b> If both teams have pocketed an equal number
							of coins at the end of 15 minutes, an additional 5 minutes is
							granted to determine the winner.
						</li>
						<li>
							<b>No Draw Policy:</b> Every match must produce a winner. If the
							match remains tied even after extended play, it will be decided
							through the Golden Strike rule.
						</li>
					</ul>
				</div>
				<div><b>👑 Queen Rule</b></div>
				<div>To ensure fairness and eliminate bonus advantage:</div>
				<div>
					<ul>
						<li>In all regular league matches, the Queen will not be used.</li>
						<li>Only white and black coins will be in play.</li>
						<li>
							This ensures no team gains an additional scoring advantage through
							the Queen.
						</li>
					</ul>
				</div>
				<div><b>🥇 Golden Strike Rule (Tie Decider)</b></div>
				<div>
					If the match is still undecided after the 5-minute extended play, a
					Golden Strike will determine the winner.
				</div>
				<div>Golden Strike Format:</div>
				<div>
					<ul>
						<li>A single Queen is placed at the center of the board.</li>
						<li>A toss is conducted to decide the first striker.</li>
						<li>Each team gets one opportunity based on turn.</li>
						<li>The team that pockets the Queen first wins the match.</li>
						<li>No cover is required during Golden Strike.</li>
						<li>
							If a player pockets the striker alone during Golden Strike, no
							fine will be imposed. The turn will pass to the opposing team.
						</li>
						<li>
							If both the striker and the Queen are pocketed in the same shot,
							the Queen will be placed back at the center of the board and the
							opponent team will be given the next turn.
						</li>
					</ul>
				</div>
				<div>
					This sudden-death format ensures high-pressure, skill-based finishes
					and guarantees a clear winner.
				</div>
				<div>To maintain fairness and discipline:</div>
				<div>
					<ul>
						<li>
							A <b>toss</b> determines the first striker and side selection.
						</li>
						<li>
							A strict <b>15-second shot clock</b> is enforced per move.
							Exceeding the time limit results in loss of turn.
						</li>
						<li>
							Teams must report at their scheduled slot. Late arrivals may be
							moved to the end of the schedule.
						</li>
					</ul>
				</div>
				<div>
					Every rule is structured to ensure competitive balance, pace, and
					integrity of the game.
				</div>
			</el-collapse-item>
			<el-collapse-item title="📊 Points & League Standings" name="3">
				<div>CPL follows a simple and transparent points structure:</div>
				<div>
					<ul>
						<li><b>Win:</b> 2 Points</li>
						<li><b>Loss:</b> 0 Points</li>
					</ul>
				</div>
				<div>
					Since matches cannot end in a draw, every game produces a winner,
					making each fixture crucial for league standings.
				</div>
			</el-collapse-item>
			<el-collapse-item title="⛓️ Tie-Breaker Criteria" name="4">
				<div>
					In case two or more teams are level on points in the league table,
					rankings will be decided using the following order:
				</div>
				<div>
					<ol>
						<li>
							<b>Head-to-Head Result</b> - The team that won the match between
							the tied teams will rank higher.
						</li>
						<li>
							<b>Net Coins Difference</b> - If still tied, the team with the
							superior net coins tally will be ranked higher.
						</li>
					</ol>
				</div>
				<div>
					These tie-breakers ensure that performance quality, not just wins,
					impacts standings.
				</div>
			</el-collapse-item>
		</el-collapse>
	</div>
</template>

<script setup>
import { ref } from "vue";
const activeNames = ref(["1", "2", "3", "4"]);
</script>

<style scoped lang="scss">
::v-deep(span.el-collapse-item__title) {
	font-weight: bold;
}
#home-page-container {
	min-height: calc(100vh - 105px);
	height: calc(100vh - 105px);
	overflow-y: auto;
}
</style>
