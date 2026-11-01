<template>
	<div class="page-container rules-page">
		<header class="page-heading">
			<div>
				<span class="page-eyebrow">Rulebook</span>
				<h1 class="page-title">Tournament Rules</h1>
				<p class="page-subtitle">Everything you need to know before the first strike.</p>
			</div>
		</header>

		<div class="rules-layout">
			<nav ref="indexRef" class="rules-index" aria-label="Rule sections">
				<a
					v-for="section in sections"
					:key="section.id"
					:href="`#${section.id}`"
					:class="{ 'is-active': activeId === section.id }"
					@click.prevent="scrollTo(section.id)"
				>
					<span aria-hidden="true">{{ section.icon }}</span>{{ section.title }}
				</a>
			</nav>

			<div ref="contentRef" class="rules-content">
				<section id="about" class="rule-card">
					<h2><span aria-hidden="true">🏆</span> About the Carrom Premier League</h2>
					<p>
						The Carrom Premier League (CPL) is a structured, competitive carrom tournament designed to
						bring together skill, strategy, and sporting spirit under one league platform.
					</p>
					<p>
						CPL is not just about pocketing coins - it is about composure under pressure, smart
						positioning, teamwork, and consistency across matches. Every team competes in a league
						format where performance across games determines their position on the table.
					</p>
					<p>
						Every match is played for 15 minutes of regulation time, with a 15-second shot clock. The
						Queen stays off the board during regulation. A league match can finish tied. A final or
						eliminator that is still tied after 5 extra minutes, or a tie for a knockout place, is
						decided by Golden Strike.
					</p>
					<p>
						The tournament is governed by a transparent points system and clear tie-breaker rules to
						maintain fairness and competitiveness throughout the season.
					</p>
				</section>

				<section id="format" class="rule-card">
					<h2><span aria-hidden="true">🎯</span> Match Format &amp; Gameplay</h2>
					<p>
						Each match is played to a fixed clock. The board has 9 white coins and 9 black coins.
						One team plays each colour, so a team cannot be credited with more than 9 of its own coins.
					</p>
					<ul>
						<li>
							<b>Regulation Time:</b> Every match lasts 15 minutes.
						</li>
						<li>
							<b>Extra Time (Only in Final / Eliminator):</b> 5 minutes extra are given.
						</li>
						<li>
							<b>Winner:</b> When time expires, the team with more coins pocketed wins the match and
							receives 2 points.
						</li>
					</ul>

					<h3>Fines</h3>
					<ul>
						<li>A <b>single fine</b> costs 1 pocketed coin.</li>
						<li>A <b>double fine</b> costs 2 pocketed coins.</li>
						<li>
							If a team does not have enough pocketed coins to cover a single or double fine, that
							fine is <b>due</b>.
						</li>
					</ul>

					<h3>Discipline</h3>
					<ul>
						<li>A <b>toss</b> determines the first striker and side selection.</li>
						<li>
							A strict <b>15-second shot clock</b> is enforced per move. Exceeding the time limit
							results in loss of turn.
						</li>
						<li>
							Teams must report at their scheduled slot. Late arrivals may be moved to the end of the
							schedule.
						</li>
					</ul>
				</section>

				<section id="points" class="rule-card">
					<h2><span aria-hidden="true">📊</span> Points &amp; League Standings</h2>
					<div class="points-grid">
						<div class="points-tile win">
							<span class="points-value">2</span>
							<span class="points-label">Points for a Win</span>
						</div>
						<div class="points-tile draw">
							<span class="points-value">1</span>
							<span class="points-label">Point each for a Tie</span>
						</div>
						<div class="points-tile loss">
							<span class="points-value">0</span>
							<span class="points-label">Points for a Loss</span>
						</div>
					</div>
					<p>
						A league tie is awarded when regulation time ends with the same number of white and black
						coins left. Each team receives 1 point. A final or eliminator that is still tied after 5
						extra minutes is decided by Golden Strike, so those matches do not share the point.
					</p>
				</section>

				<section id="tie-breakers" class="rule-card">
					<h2><span aria-hidden="true">⛓️</span> Tie-Breaker</h2>

					<h3>Ranking Ties</h3>
					<p>After the league stage, these tie-breakers separate teams tied for a knockout place.</p>
					<ul>
						<li>
							<b>Eliminator:</b> When more than four teams are playing, they decide teams tied for #1,
							#2, and #3.
						</li>
						<li>
							<b>Final:</b> When four teams are playing, they decide the #1 and #2 ranking for the
							final.
						</li>
					</ul>
					<p>Teams on the same points are separated in this order:</p>
					<ol>
						<li>
							<b>Net Coins</b> - The team with the superior net coins tally ranks higher. Wins add
							the coin margin and losses subtract it.
						</li>
						<li>
							<b>Head-to-Head Result</b> - If the net coins are also level, the team that won the
							league match between the tied teams ranks higher.
						</li>
					</ol>
					<p>
						If a knockout place is still tied after both checks, the system schedules Golden Strike
						between those teams and assigns the place from that result.
					</p>

					<h3>Final / Eliminator Ties</h3>
					<p>
						If the final or the eliminator is tied after 15 minutes, with the same number of white and
						black coins left, 5 more minutes are played. If the match is still tied after that extra
						time, the system schedules a Golden Strike between the same teams. These matches do not
						share 1 point. The winner of that Golden Strike takes the knockout place.
					</p>
				</section>

				<section id="golden-strike" class="rule-card highlight">
					<h2><span aria-hidden="true">🥇</span> Golden Strike</h2>
					<ol>
						<li>A single Queen is placed at the center of the board.</li>
						<li>A toss decides the first striker.</li>
						<li>Each team gets one opportunity based on turn.</li>
						<li>The team that pockets the Queen first wins.</li>
						<li>No cover is required.</li>
						<li>
							If a player pockets the striker alone, no fine is imposed. The turn passes to the
							opposing team.
						</li>
						<li>
							If the striker and the Queen are pocketed in the same shot, the Queen is placed back at
							the center and the opposing team takes the next turn.
						</li>
					</ol>
				</section>

				<section id="knockout" class="rule-card">
					<h2><span aria-hidden="true">🏁</span> Finals</h2>
					<ul>
						<li>
							<b>Four teams:</b> When the league is complete, the system schedules a final between
							#1 and #2. A tie for either place schedules Golden Strike first.
						</li>
						<li>
							<b>More than four teams:</b> When the league is complete, the system schedules an
							eliminator between #2 and #3, then a final between #1 and the eliminator winner. A tie
							for #1 or for an eliminator place schedules Golden Strike first.
						</li>
					</ul>
				</section>
				<div class="rules-scroll-end" aria-hidden="true"></div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";

const sections = [
	{ id: "about", icon: "🏆", title: "About CPL" },
	{ id: "format", icon: "🎯", title: "Match Format" },
	{ id: "points", icon: "📊", title: "Points" },
	{ id: "tie-breakers", icon: "⛓️", title: "Tie-Breaker" },
	{ id: "golden-strike", icon: "🥇", title: "Golden Strike" },
	{ id: "knockout", icon: "🏁", title: "Finals" },
];

const activeId = ref(sections[0].id);
const contentRef = ref(null);
const indexRef = ref(null);
let resizeObserver = null;
let lockActive = false;
let lockTimer = null;

const syncScrollEnd = () => {
	const scroller = contentRef.value;
	const spacer = scroller?.querySelector(".rules-scroll-end");
	if (!scroller || !spacer) return;
	spacer.style.height = `${Math.max(scroller.clientHeight - 120, 24)}px`;
};

const scrollChipIntoView = (id) => {
	const index = indexRef.value;
	if (!index || index.scrollWidth <= index.clientWidth + 1) return;
	const link = index.querySelector(`a[href="#${id}"]`);
	if (!link) return;
	const targetLeft = link.offsetLeft - (index.clientWidth - link.offsetWidth) / 2;
	const maxLeft = index.scrollWidth - index.clientWidth;
	index.scrollTo({
		left: Math.min(Math.max(targetLeft, 0), maxLeft),
		behavior: "smooth",
	});
};

const updateActiveFromScroll = () => {
	if (lockActive) return;
	const scroller = contentRef.value;
	if (!scroller) return;
	const marker = scroller.getBoundingClientRect().top + 28;
	let current = sections[0].id;
	for (const section of sections) {
		const el = document.getElementById(section.id);
		if (el && el.getBoundingClientRect().top <= marker) current = section.id;
	}
	if (current !== activeId.value) activeId.value = current;
};

const scrollTo = (id) => {
	const scroller = contentRef.value;
	const target = document.getElementById(id);
	if (!scroller || !target) return;
	const top =
		target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
	lockActive = true;
	activeId.value = id;
	scroller.scrollTo({ top: Math.max(top - 4, 0), behavior: "smooth" });
	clearTimeout(lockTimer);
	const release = () => {
		lockActive = false;
	};
	scroller.addEventListener("scrollend", release, { once: true });
	lockTimer = setTimeout(release, 800);
};

watch(activeId, (id) => scrollChipIntoView(id));

onMounted(() => {
	document.getElementById("app")?.classList.add("rules-screen");
	syncScrollEnd();
	resizeObserver = new ResizeObserver(syncScrollEnd);
	contentRef.value?.addEventListener("scroll", updateActiveFromScroll, { passive: true });
	if (contentRef.value) resizeObserver.observe(contentRef.value);
});

onUnmounted(() => {
	clearTimeout(lockTimer);
	contentRef.value?.removeEventListener("scroll", updateActiveFromScroll);
	resizeObserver?.disconnect();
	document.getElementById("app")?.classList.remove("rules-screen");
});
</script>

<style scoped lang="scss">
:global(html:has(#app.rules-screen)),
:global(body:has(#app.rules-screen)) {
	height: 100%;
	overflow: hidden;
}

:global(#app.rules-screen) {
	height: 100dvh;
	max-height: 100dvh;
	overflow: hidden;
}

:global(#app.rules-screen #app-content) {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

.rules-page {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	width: 100%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	padding-top: clamp(12px, 2.5vw, 28px);
	padding-bottom: clamp(12px, 2vw, 20px);
}

.rules-page .page-heading {
	flex-shrink: 0;
	margin-bottom: clamp(12px, 2vw, 20px);
}

.rules-layout {
	display: grid;
	flex: 1 1 auto;
	grid-template-columns: minmax(168px, 220px) minmax(0, 1fr);
	gap: clamp(12px, 2vw, 28px);
	align-items: stretch;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

.rules-index {
	display: flex;
	flex-direction: column;
	gap: 4px;
	align-self: stretch;
	min-width: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;

	a {
		display: flex;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 10px;
		color: var(--cpl-ink-600);
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		transition: background 0.2s ease, color 0.2s ease;

		&:hover {
			background: #fff;
			color: var(--cpl-ink-900);
		}

		&.is-active {
			background: var(--cpl-navy-900);
			color: var(--cpl-gold-400);
		}
	}
}

.rules-content {
	display: flex;
	flex-direction: column;
	gap: 18px;
	align-self: stretch;
	min-width: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
	padding-right: 4px;
	padding-bottom: 8px;
}

.rules-scroll-end {
	flex: 0 0 auto;
	height: 24px;
}

.rule-card {
	flex-shrink: 0;
	scroll-margin-top: 0;
	padding: clamp(18px, 3vw, 30px);
	border-radius: var(--cpl-radius-lg);
	background: #fff;
	border: 1px solid var(--cpl-line);
	box-shadow: var(--cpl-shadow-card);
	line-height: 1.7;
	color: var(--cpl-ink-600);
	overflow-wrap: anywhere;

	h2 {
		font-family: var(--cpl-font-display);
		font-size: clamp(19px, 2.6vw, 24px);
		font-weight: 700;
		color: var(--cpl-ink-900);
		margin: 0 0 12px;
	}

	h3 {
		font-size: 16px;
		font-weight: 600;
		color: var(--cpl-ink-900);
		margin: 18px 0 8px;
	}

	p:last-child,
	ul:last-child,
	ol:last-child {
		margin-bottom: 0;
	}

	b {
		color: var(--cpl-ink-900);
	}

	&.highlight {
		border-color: rgba(245, 184, 46, 0.45);
		background: linear-gradient(135deg, var(--cpl-gold-100) 0%, #fff 55%);
	}
}

.points-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
	margin-bottom: 14px;
}

.points-tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 18px 10px;
	border-radius: var(--cpl-radius-md);
	text-align: center;

	&.win {
		background: #ecfdf3;
		color: #166534;
	}
	&.draw {
		background: #fffbeb;
		color: #92400e;
	}
	&.loss {
		background: #fef2f2;
		color: #991b1b;
	}
}

.points-value {
	font-family: var(--cpl-font-display);
	font-size: 40px;
	font-weight: 800;
	line-height: 1;
}

.points-label {
	font-size: 13px;
	font-weight: 500;
	margin-top: 6px;
}

@media (max-width: 991.98px) {
	.rules-layout {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		gap: 12px;
	}

	.rules-index {
		z-index: 5;
		flex-direction: row;
		align-self: stretch;
		overflow-x: auto;
		overflow-y: hidden;
		margin: 0;
		padding: 2px 0 8px;
		background: transparent;
		scrollbar-width: none;

		&::-webkit-scrollbar {
			display: none;
		}

		a {
			flex: 0 0 auto;
			background: #fff;
			border: 1px solid var(--cpl-line);
			border-radius: 999px;
			padding: 8px 14px;
		}
	}
}

@media (max-width: 575.98px) {
	.points-grid {
		grid-template-columns: 1fr;
	}

	.points-value {
		font-size: 32px;
	}
}
</style>
