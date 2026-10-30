// "السيرة تحمل اسمك… خلّها تحمل بصمتك" — 60 s, 9:16, built on the voiceover timings.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, interpolateColors, random, staticFile, useCurrentFrame} from 'remotion';
import {C, EXPO, FPS, IN_OUT, arabic, pop, tween} from './kit/theme';
import {Caption, CaptionBand, Sfx, Backdrop} from './kit/kit';
import {ICONS, IconName} from './kit/icons';

export const TOTAL = 60 * FPS;
const P = 'cv-fingerprint/';

// ---------- voiceover: phrase segments in the file (voice-timings.mjs), placed with tightened pauses ----------
const SEG: [number, number][] = [
	[0, 1.97], [2.6, 4.16], [4.65, 5.12], [5.31, 6.65], [6.87, 9.68], [10.26, 12.14], [12.53, 12.97], [13.36, 13.91], [14.16, 15.29],
	[15.84, 16.12], [16.43, 17.54], [18.04, 18.87], [19.56, 21.98], [22.28, 22.98], [23.39, 24.55], [25.01, 26.93], [27.39, 28.71],
	[29.16, 30.87], [31.4, 32.17], [32.38, 33.75], [34.07, 35.21], [35.52, 36.56], [36.85, 38.14], [38.6, 40.25], [40.44, 44.35],
	[44.99, 45.55], [45.79, 46.81], [47.2, 48.17], [48.52, 50.37], [50.82, 51.42], [51.61, 54.28], [54.68, 56.63], [56.95, 58.38],
	[58.92, 60.0], [60.6, 61.62],
];
// longest pause kept after each phrase (seconds); a bit more around "هنا يجي دورك"
const keep = (i: number) => (i === 10 || i === 11 ? 0.5 : 0.28);
const PLACED = (() => {
	let t = 0.3;
	return SEG.map(([a, b], i) => {
		const r = {a, b, at: t};
		const gap = i < SEG.length - 1 ? SEG[i + 1][0] - b : 0;
		t += b - a + Math.min(gap, keep(i));
		return r;
	});
})();
const V = (i: number) => PLACED[i].at; // video second where phrase i starts

const s = (t: number) => Math.round(t * FPS);
const tw = (f: number, t: number, dur: number, from = 0, to = 1, e: (x: number) => number = EXPO) => tween(f, s(t), s(dur), from, to, e);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const arDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

// ---------- small building blocks ----------
const Icon: React.FC<{name: IconName; size: number; color: string; stroke?: number}> = ({name, size, color, stroke = 2}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html: ICONS[name]}} />
);

const Disc: React.FC<{x: number; y: number; size: number; bg: string; icon?: IconName; iconColor?: string; scale?: number; o?: number; children?: React.ReactNode; shadow?: boolean}> = ({x, y, size, bg, icon, iconColor = '#fff', scale = 1, o = 1, children, shadow = true}) => (
	<div
		style={{
			position: 'absolute',
			left: x - size / 2,
			top: y - size / 2,
			width: size,
			height: size,
			borderRadius: '50%',
			background: bg,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			transform: `scale(${scale})`,
			opacity: o,
			boxShadow: shadow ? '0 18px 40px rgba(27,35,51,0.18)' : undefined,
		}}
	>
		{icon ? <Icon name={icon} size={size * 0.5} color={iconColor} /> : null}
		{children}
	</div>
);

const Text: React.FC<{x?: number; y: number; size: number; weight?: number; color?: string; o?: number; dy?: number; sc?: number; children: React.ReactNode; w?: number}> = ({x = 540, y, size, weight = 700, color = C.ink, o = 1, dy = 0, sc = 1, children, w = 940}) => (
	<div
		style={{
			position: 'absolute',
			left: x - w / 2,
			width: w,
			top: y - size * 0.7,
			textAlign: 'center',
			direction: 'rtl',
			fontFamily: arabic,
			fontSize: size,
			fontWeight: weight,
			color,
			lineHeight: 1.4,
			opacity: o,
			transform: `translateY(${dy}px) scale(${sc})`,
		}}
	>
		{children}
	</div>
);

// ---------- the CV ----------
const CW = 600;
const CH = 820;
const BADGE_TOPS = [250, 380, 510, 640];
const BADGE_ICONS: IconName[] = ['target', 'graduation-cap', 'lightbulb', 'trophy'];
const LINES = [
	{y: 300, w: 400},
	{y: 336, w: 340},
	{y: 372, w: 270},
	{y: 660, w: 380},
	{y: 696, w: 250},
];
type CVProps = {
	tone?: 'gray' | 'you';
	redact?: number;
	fill?: number;
	name?: boolean;
	chips?: {t: string; p: number}[];
	badges?: number[];
	warm?: number;
	job?: number;
	scatter?: number;
	checks?: number[];
	avatar?: number;
	hl?: number;
};

const scat = (i: number, k: number) => ({
	x: (random(`x${i}`) - 0.5) * 420 * k,
	y: (random(`y${i}`) - 0.5) * 300 * k,
	r: (random(`r${i}`) - 0.5) * 40 * k,
});

const CV: React.FC<CVProps> = ({tone = 'gray', redact = 0, fill = 1, name = true, chips = [], badges = [], warm = 0, job = 0, scatter = 0, checks = [], avatar = 0, hl = 0}) => {
	const lineColor = interpolateColors(warm, [0, 1], [C.gray, '#FFC6A8']);
	const border = tone === 'you' ? C.accent : interpolateColors(hl, [0, 1], ['rgba(27,35,51,0.06)', C.accent]);
	const lineP = (i: number) => clamp01(fill * 1.8 - i * 0.14);
	const sc = (i: number) => {
		const d = scat(i, scatter);
		return `translate(${d.x}px, ${d.y}px) rotate(${d.r}deg)`;
	};
	const head = (label: string, top: number, i: number) => (
		<div style={{position: 'absolute', right: 50, top, fontFamily: arabic, fontSize: 30, fontWeight: 600, color: tone === 'you' ? C.accent : C.muted, direction: 'rtl', transform: sc(i), opacity: lineP(i)}}>{label}</div>
	);
	return (
		<div style={{position: 'absolute', inset: 0, background: C.card, borderRadius: 28, border: `${tone === 'you' || hl > 0 ? 4 : 2}px solid ${border}`, boxShadow: '0 30px 70px rgba(27,35,51,0.14)'}}>
			{/* avatar */}
			<div style={{position: 'absolute', right: 50, top: 56, width: 120, height: 120, borderRadius: '50%', background: avatar > 0 ? '#FFF1EA' : C.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: avatar > 0 ? `0 0 0 ${6 * avatar}px ${C.accent}` : undefined}}>
				{avatar > 0 ? (
					<div style={{transform: `scale(${avatar})`}}>
						<Icon name="fingerprint" size={84} color={C.accent} stroke={1.6} />
					</div>
				) : (
					<Icon name="user" size={64} color="#B5B9C1" />
				)}
			</div>
			{/* name */}
			{name ? (
				<div style={{position: 'absolute', right: 200, top: 58, fontFamily: arabic, fontSize: 54, fontWeight: 700, color: C.ink, direction: 'rtl'}}>اسمك</div>
			) : (
				<div style={{position: 'absolute', right: 200, top: 82, width: 230, height: 30, borderRadius: 15, background: '#CDD1D7'}} />
			)}
			<div style={{position: 'absolute', right: 200, top: 146, width: 220, height: 18, borderRadius: 9, background: lineColor, transformOrigin: 'right', transform: `scaleX(${lineP(0)})`}} />
			{/* name redaction */}
			<div style={{position: 'absolute', left: 170, top: 58, width: 240, height: 72, borderRadius: 10, background: C.ink, transformOrigin: 'right', transform: `scaleX(${redact})`}} />
			<div style={{position: 'absolute', left: 50, right: 50, top: 216, height: 2, background: 'rgba(27,35,51,0.08)'}} />
			{head('الخبرات', 246, 1)}
			{head('المهارات', 430, 4)}
			{head('التعليم', 606, 6)}
			{LINES.map((l, i) => (
				<div key={i} style={{position: 'absolute', right: 50, top: l.y, width: l.w, height: 16, borderRadius: 8, background: lineColor, transformOrigin: 'right', transform: `${sc(i + 10)} scaleX(${lineP(i + (i > 2 ? 4 : 2))})`}} />
			))}
			{/* checks next to lines */}
			{LINES.map((l, i) =>
				(checks[i] ?? 0) > 0 ? (
					<div key={`c${i}`} style={{position: 'absolute', left: CW - 50 - l.w - 48, top: l.y - 8, width: 32, height: 32, borderRadius: 16, background: C.accent, transform: `scale(${checks[i]})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
						<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
							<path d="m5 12.5 4.5 4.5L19 7.5" />
						</svg>
					</div>
				) : null,
			)}
			{/* skill chips */}
			<div style={{position: 'absolute', right: 50, top: 482, width: 500, display: 'flex', flexWrap: 'wrap', gap: 10, direction: 'rtl', transform: sc(5)}}>
				{chips.length === 0
					? [150, 120, 170].map((w, i) => <div key={i} style={{width: w, height: 44, borderRadius: 22, background: lineColor, opacity: lineP(5)}} />)
					: chips.map((c, i) => (
							<div key={i} style={{padding: '6px 20px', borderRadius: 26, background: '#DCE3F0', color: C.ink, fontFamily: arabic, fontSize: 30, fontWeight: 600, transform: `scale(${c.p})`, opacity: Math.min(1, c.p * 2)}}>
								{c.t}
							</div>
						))}
			</div>
			{/* badges added by "you" */}
			{badges.map((p, i) =>
				p > 0 ? <Disc key={i} x={36 + 38} y={BADGE_TOPS[i] + 38} size={76} bg={C.accent} icon={BADGE_ICONS[i]} scale={p} shadow={false} /> : null,
			)}
			{/* target job tag */}
			{job > 0 ? (
				<div style={{position: 'absolute', left: 36, top: -34, height: 64, padding: '0 24px', borderRadius: 32, background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl', fontFamily: arabic, fontSize: 30, fontWeight: 600, transform: `scale(${job})`, transformOrigin: 'left center'}}>
					<Icon name="target" size={34} color={C.accent} />
					مدير مشاريع
				</div>
			) : null}
		</div>
	);
};

const Place: React.FC<{x: number; y: number; sc?: number; rot?: number; o?: number; clip?: string; children: React.ReactNode}> = ({x, y, sc = 1, rot = 0, o = 1, clip, children}) => (
	<div style={{position: 'absolute', left: x - CW / 2, top: y - CH / 2, width: CW, height: CH, transform: `scale(${sc}) rotate(${rot}deg)`, opacity: o, clipPath: clip}}>{children}</div>
);
// screen position of a point inside a placed CV
const cvPt = (x: number, y: number, sc: number, lx: number, ly: number) => ({x: x + (lx - CW / 2) * sc, y: y + (ly - CH / 2) * sc});

// AI prompt box (violet = the helper)
const AIBox: React.FC<{y: number; text: string; chars?: number; o?: number; dy?: number; sc?: number; glow?: number; cursor?: boolean}> = ({y, text, chars, o = 1, dy = 0, sc = 1, glow = 0, cursor = false}) => {
	const f = useCurrentFrame();
	const shown = chars === undefined ? text : Array.from(text).slice(0, chars).join('');
	return (
		<div
			style={{
				position: 'absolute',
				left: 90,
				width: 900,
				top: y - 65,
				height: 130,
				borderRadius: 65,
				background: '#fff',
				border: `3px solid ${C.ai}`,
				boxShadow: `0 20px 50px rgba(108,92,231,${0.18 + glow * 0.35}), 0 0 0 ${glow * 14}px rgba(108,92,231,0.12)`,
				display: 'flex',
				alignItems: 'center',
				direction: 'rtl',
				padding: '0 34px',
				gap: 20,
				opacity: o,
				transform: `translateY(${dy}px) scale(${sc})`,
			}}
		>
			<Icon name="sparkles" size={52} color={C.ai} />
			<div style={{flex: 1, fontFamily: arabic, fontSize: 40, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden'}}>
				{shown}
				{cursor ? <span style={{color: C.ai, opacity: Math.floor(f / 18) % 2 ? 0 : 1}}>|</span> : null}
			</div>
			<div style={{width: 76, height: 76, borderRadius: 38, background: C.ai, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
					<path d="M12 19V5M5 12l7-7 7 7" />
				</svg>
			</div>
		</div>
	);
};

// gear outline
const gearPath = (R: number, teeth: number, depth: number) => {
	const pts: string[] = [];
	const step = (Math.PI * 2) / teeth;
	for (let i = 0; i < teeth; i++) {
		const a = i * step;
		const seq: [number, number][] = [
			[a, R - depth],
			[a + step * 0.12, R],
			[a + step * 0.45, R],
			[a + step * 0.57, R - depth],
		];
		seq.forEach(([ang, r]) => pts.push(`${(Math.cos(ang) * r).toFixed(1)} ${(Math.sin(ang) * r).toFixed(1)}`));
	}
	return `M${pts.join(' L')} Z`;
};
const Gear: React.FC<{x: number; y: number; R: number; teeth: number; color: string; rot: number; sc?: number; icon: IconName}> = ({x, y, R, teeth, color, rot, sc = 1, icon}) => (
	<div style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, transform: `scale(${sc})`}}>
		<svg width={R * 2} height={R * 2} viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} style={{position: 'absolute', inset: 0, transform: `rotate(${rot}deg)`}}>
			<path d={gearPath(R, teeth, R * 0.14)} fill={color} />
			<circle r={R * 0.62} fill="rgba(255,255,255,0.14)" />
		</svg>
		<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
			<Icon name={icon} size={R * 0.7} color="#fff" />
		</div>
	</div>
);

const FP_PATHS = Array.from(ICONS.fingerprint.matchAll(/d="([^"]+)"/g)).map((m) => m[1]);
const Fingerprint: React.FC<{x: number; y: number; size: number; draw: number; color?: string}> = ({x, y, size, draw, color = C.accent}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={{position: 'absolute', left: x - size / 2, top: y - size / 2, overflow: 'visible'}} fill="none" stroke={color} strokeWidth={1.15} strokeLinecap="round">
		{FP_PATHS.map((d, i) => {
			const p = clamp01(draw * 1.6 - i * 0.07);
			return <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
		})}
	</svg>
);

// ========== scenes (absolute frame f; times in video seconds) ==========

// S1 — a CV whose owner's name gets hidden
const S1_X = 540;
const S1_Y = 860;
const Scene1: React.FC<{f: number}> = ({f}) => {
	const enter = tw(f, 0, 0.8);
	const push = tw(f, V(1), 1.6, 0, 1, IN_OUT);
	const sc = (0.94 + 0.06 * enter) * lerp(1, 1.1, push);
	const exit = tw(f, 4.3, 0.35, 0, 1, IN_OUT);
	const q = pop(f, s(V(1) + 0.9));
	const qPt = cvPt(S1_X, S1_Y, sc, 40, 30);
	return (
		<>
			<Place x={S1_X} y={S1_Y + (1 - enter) * 90 + exit * 60} sc={sc} o={enter * (1 - exit)}>
				<CV tone="gray" redact={tw(f, 0.75, 0.5, 0, 1, IN_OUT)} fill={tw(f, 0.1, 1.2)} />
			</Place>
			<Disc x={qPt.x} y={qPt.y} size={130} bg={C.accent} scale={q} o={1 - exit}>
				<span style={{fontFamily: arabic, fontSize: 84, fontWeight: 700, color: '#fff', marginTop: -8}}>؟</span>
			</Disc>
		</>
	);
};

// S2 — the hiding bar morphs into an AI prompt box that "writes" a polished CV
const S2_CV_Y = 1000;
const S2_CV_SC = 0.85;
const Scene2: React.FC<{f: number}> = ({f}) => {
	const m = tw(f, 4.3, 0.8, 0, 1, IN_OUT);
	// bar rect at the end of scene 1 (card at scale 1.1): left 397, top 473, 264×79
	const r = {x: lerp(397, 90, m), y: lerp(473, 335, m), w: lerp(264, 900, m), h: lerp(79, 130, m), rad: lerp(10, 65, m)};
	const typing = Math.floor(interpolate(f, [s(4.95), s(6.4)], [0, 28], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
	const out = tw(f, V(5) - 0.15, 0.4, 0, 1, IN_OUT);
	const cvIn = tw(f, V(4), 0.8);
	return (
		<>
			{m < 1 ? (
				<div style={{position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.rad, background: interpolateColors(m, [0, 0.6, 1], [C.ink, '#fff', '#fff']), border: `${3 * m}px solid ${C.ai}`}} />
			) : (
				<AIBox y={400} text="اكتب لي سيرة ذاتية احترافية" chars={typing} cursor={f < s(V(4))} o={1 - out} dy={-out * 60} glow={tw(f, V(4), 0.3) * (1 - tw(f, V(4) + 0.4, 0.6))} />
			)}
			{f < s(V(5)) ? (
				<Place x={540} y={lerp(S2_CV_Y - 120, S2_CV_Y, cvIn)} sc={S2_CV_SC} o={Math.min(1, cvIn * 1.6)} clip={`inset(0 0 ${(1 - cvIn) * 100}% 0 round 28px)`}>
					<CV tone="gray" name={false} fill={tw(f, V(4) + 0.2, 1.8, 0, 1, IN_OUT)} />
				</Place>
			) : null}
		</>
	);
};

// S3 — pull out: the CV is one of many identical CVs; clichés stamped on all; a magnifier searches
const GRID = Array.from({length: 15}, (_, i) => ({c: i % 3, r: Math.floor(i / 3)}));
const TARGET = {c: 2, r: 1};
const Z_END = 0.34;
const camS3 = (f: number) => {
	const p = tw(f, V(5), 1.8, 0, 1, IN_OUT);
	const z = lerp(1, Z_END, p) * lerp(1, 1.05, tw(f, V(5) + 1.8, 5.5, 0, 1, IN_OUT));
	return {z, cy: lerp(S2_CV_Y, 700, p)};
};
const gridPt = (f: number, c: number, r: number) => {
	const {z, cy} = camS3(f);
	return {x: 540 + (c - 1) * 560 * z, y: cy + (r - 2) * 760 * z, z};
};
const CLICHES = ['شغوف', 'قيادي', 'أتحمّل ضغط العمل'];
const Scene3: React.FC<{f: number}> = ({f}) => {
	const chipP = (k: number, c: number, r: number) => pop(f, s(V(6 + k)) + (Math.abs(c - 1) + r) * 2, 16);
	// magnifier path
	const mPts = [
		{x: 260, y: 360},
		{x: 800, y: 900},
		{x: 300, y: 1130},
		{...gridPt(s(V(11)), TARGET.c, TARGET.r)},
	];
	const mT = [V(9), V(9) + 0.6, V(9) + 1.2, V(11) - 0.35];
	let mx = mPts[0].x;
	let my = mPts[0].y;
	for (let i = 1; i < mPts.length; i++) {
		const p = tw(f, mT[i - 1], mT[i] - mT[i - 1], 0, 1, IN_OUT);
		if (f >= s(mT[i - 1])) {
			mx = lerp(mPts[i - 1].x, mPts[i].x, p);
			my = lerp(mPts[i - 1].y, mPts[i].y, p);
		}
	}
	const mIn = tw(f, V(9) - 0.2, 0.5);
	const hl = tw(f, V(11) - 0.4, 0.35);
	return (
		<>
			{GRID.map(({c, r}, i) => {
				const pt = gridPt(f, c, r);
				const isT = c === TARGET.c && r === TARGET.r;
				return (
					<Place key={i} x={pt.x} y={pt.y} sc={S2_CV_SC * pt.z}>
						<CV tone="gray" name={false} chips={CLICHES.map((t, k) => ({t, p: chipP(k, c, r)}))} hl={isT ? hl : 0} />
					</Place>
				);
			})}
			<div style={{opacity: tw(f, V(5) + 0.3, 0.6)}}>
				<CaptionBand top={1280} />
			</div>
			{/* the cliché, big, swapping in place */}
			{CLICHES.map((t, k) => {
				const a = pop(f, s(V(6 + k)), 15);
				const gone = k < 2 ? tw(f, V(7 + k), 0.3, 0, 1, IN_OUT) : tw(f, V(9) - 0.3, 0.3, 0, 1, IN_OUT);
				if (f < s(V(6 + k)) || gone >= 1) return null;
				return (
					<div key={k} style={{position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', justifyContent: 'center', opacity: 1 - gone, transform: `translateY(${-gone * 50}px)`}}>
						<div style={{padding: '14px 46px', borderRadius: 60, background: '#DCE3F0', fontFamily: arabic, fontSize: 82, fontWeight: 700, color: C.ink, direction: 'rtl', transform: `scale(${a})`}}>«{t}»</div>
					</div>
				);
			})}
			{/* magnifier */}
			{mIn > 0 ? (
				<div style={{position: 'absolute', left: mx - 80, top: my - 80, width: 160, height: 160, opacity: mIn, transform: `scale(${0.6 + 0.4 * mIn})`}}>
					<div style={{position: 'absolute', inset: 0, borderRadius: '50%', border: `12px solid ${C.accent}`, background: 'rgba(255,107,44,0.08)'}} />
					<div style={{position: 'absolute', left: 128, top: 128, width: 80, height: 22, borderRadius: 11, background: C.accent, transform: 'rotate(45deg)', transformOrigin: '0 50%'}} />
				</div>
			) : null}
		</>
	);
};

// S5 — hard cut on the beat: "دورك"
const Scene5: React.FC<{f: number}> = ({f}) => {
	const t0 = V(11);
	const zoom = lerp(1, 1.06, tw(f, t0, 1.4, 0, 1, IN_OUT));
	const a = tw(f, t0, 0.5);
	const b = pop(f, s(t0 + 0.32), 12);
	return (
		<div style={{position: 'absolute', inset: 0, transform: `scale(${zoom})`}}>
			<Place x={540} y={900} sc={1.25} rot={-5} o={0.13}>
				<CV tone="you" name={false} />
			</Place>
			<Text y={640} size={84} weight={600} o={a} dy={(1 - a) * 40}>
				هنا يجي
			</Text>
			<Text y={860} size={300} weight={700} color={C.accent} sc={b}>
				دورك
			</Text>
		</div>
	);
};

// S6 — before you ask the AI… ask yourself
const Scene6: React.FC<{f: number}> = ({f}) => {
	const ent = tw(f, 18.4, 0.6);
	const ask = tw(f, V(13), 0.6, 0, 1, IN_OUT);
	// mouse heads for "send", then stops
	const mv = tw(f, V(12) + 0.6, 1.3, 0, 1, IN_OUT);
	const mx = lerp(760, 190, mv);
	const my = lerp(1250, 930 + 10, mv);
	const q = pop(f, s(V(13) + 0.05), 13);
	return (
		<>
			<AIBox y={lerp(900, 1180, ask)} text="اكتب لي سيرتي" cursor o={ent * lerp(1, 0.3, ask)} dy={(1 - ent) * 60} sc={lerp(1, 0.86, ask)} />
			<svg width={64} height={64} viewBox="0 0 24 24" style={{position: 'absolute', left: mx, top: my + ask * 280, opacity: ent * (1 - ask)}}>
				<path d="M4 3l15 7.5-6.5 1.8L10 19z" fill={C.ink} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
			</svg>
			<Disc x={540} y={560} size={220} bg={C.accent} scale={q}>
				<span style={{fontFamily: arabic, fontSize: 150, fontWeight: 700, color: '#fff', marginTop: -14}}>؟</span>
			</Disc>
		</>
	);
};

// S7 — four questions, each takes centre stage, then lands in your CV
const QS = ['وش يميّز تجربتي؟', 'وش تعلّمت من دراستي وشهاداتي؟', 'وش المشكلة اللي حلّيتها؟', 'وش الإنجاز اللي أفتخر فيه؟'];
const QT = [V(14), V(15), V(16), V(17), V(18) - 0.15];
const HERO7 = {x: 540, y: 1250, sc: 0.5};
const Scene7: React.FC<{f: number}> = ({f}) => {
	const cvIn = tw(f, V(14), 0.7);
	const landed = QT.slice(1).map((t) => tw(f, t + 0.15, 0.25));
	return (
		<>
			<Place x={HERO7.x} y={HERO7.y + (1 - cvIn) * 260} sc={HERO7.sc} o={cvIn}>
				<CV tone="you" name={false} badges={landed.map((l, k) => (l > 0 ? pop(f, s(QT[k + 1] + 0.15), 14) : 0))} warm={landed.reduce((a, b) => a + b, 0) / 4} />
			</Place>
			{QS.map((q, i) => {
				const t0 = QT[i];
				const t1 = QT[i + 1];
				if (f < s(t0) || f > s(t1 + 0.2)) return null;
				const inP = i === 0 ? 1 : pop(f, s(t0), 14);
				const fly = tw(f, t1 - 0.4, 0.55, 0, 1, IN_OUT);
				const dst = cvPt(HERO7.x, HERO7.y, HERO7.sc, 36 + 38, BADGE_TOPS[i] + 38);
				return (
					<React.Fragment key={i}>
						<Disc x={lerp(540, dst.x, fly)} y={lerp(560, dst.y, fly)} size={lerp(220, 38, fly)} bg={C.accent} icon={BADGE_ICONS[i]} scale={inP} o={fly >= 1 ? 0 : 1} />
						<Caption text={q} from={s(t0 + 0.05)} to={s(t1 - 0.1)} y={720} size={68} weight={700} accent={[q.split(' ').slice(-1)[0]]} />
					</React.Fragment>
				);
			})}
		</>
	);
};

// S8 — instead of a cliché: a team, a challenge, a result
const ROWS = [
	{icon: 'users' as IconName, title: 'فريق قدته', sub: 'قدت فريق من ٥ أشخاص لإطلاق خدمة جديدة'},
	{icon: 'target' as IconName, title: 'تحدّي واجهته', sub: 'وقت ضيق: شهرين بدل أربعة'},
	{icon: 'award' as IconName, title: 'النتيجة اللي حققتها', sub: 'رضا العملاء ارتفع'},
];
const ROW_Y = [770, 990, 1210];
const Row: React.FC<{i: number; f: number; x?: number; y?: number; sc?: number; o?: number}> = ({i, f, x = 540, y = ROW_Y[i], sc = 1, o = 1}) => {
	const r = ROWS[i];
	const n = Math.round(interpolate(f, [s(V(22)), s(V(22) + 0.9)], [0, 30], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EXPO}));
	return (
		<div style={{position: 'absolute', left: x - 450, top: y - 90, width: 900, height: 180, borderRadius: 30, background: '#fff', boxShadow: '0 20px 50px rgba(27,35,51,0.10)', border: `3px solid ${C.accent}`, display: 'flex', alignItems: 'center', direction: 'rtl', padding: '0 30px', gap: 26, transform: `scale(${sc})`, opacity: o}}>
			<div style={{width: 110, height: 110, borderRadius: 55, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
				<Icon name={r.icon} size={58} color="#fff" />
			</div>
			<div style={{flex: 1, fontFamily: arabic}}>
				<div style={{fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1.3}}>{r.title}</div>
				<div style={{fontSize: 32, fontWeight: 500, color: C.muted, lineHeight: 1.4}}>{r.sub}</div>
			</div>
			{i === 2 ? <div style={{fontFamily: arabic, fontSize: 76, fontWeight: 700, color: C.accent, direction: 'rtl'}}>+{arDigits(n)}٪</div> : null}
		</div>
	);
};
const Scene8: React.FC<{f: number}> = ({f}) => {
	const chipIn = tw(f, V(19) - 0.25, 0.6);
	const strike = tw(f, V(20) - 0.35, 0.35, 0, 1, IN_OUT);
	const away = tw(f, V(20) - 0.05, 0.6, 0, 1, IN_OUT);
	const head = tw(f, V(18) + 0.05, 0.5);
	return (
		<>
			<Text y={lerp(450, 250, away)} size={50} weight={500} color={C.muted} o={head * lerp(1, 0.6, away)}>
				بدل تقول:
			</Text>
			<div style={{position: 'absolute', left: 0, right: 0, top: lerp(560, 330, away), display: 'flex', justifyContent: 'center', opacity: chipIn * lerp(1, 0.45, away), transform: `translateY(${(1 - chipIn) * 50}px) scale(${lerp(1, 0.72, away)})`}}>
				<div style={{position: 'relative', padding: '16px 46px', borderRadius: 60, background: '#DCE3F0', fontFamily: arabic, fontSize: 68, fontWeight: 700, color: C.ink, direction: 'rtl'}}>
					«عندي مهارات قيادية»
					<div style={{position: 'absolute', left: 20, right: 20, top: '52%', height: 9, borderRadius: 5, background: C.accent, transformOrigin: 'right', transform: `scaleX(${strike})`}} />
				</div>
			</div>
			{ROWS.map((_, i) => {
				const t0 = V(20 + i);
				const e = tw(f, t0, 0.7);
				if (f < s(t0)) return null;
				const dim = i < 2 ? tw(f, V(21 + i), 0.4) * (1 - tw(f, V(22) + 1.0, 0.4)) : 0;
				return (
					<div key={i} style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - e) * 140}px)`, opacity: e * (1 - dim * 0.55)}}>
						<Row i={i} f={f} />
					</div>
				);
			})}
		</>
	);
};

// S9 — give it your real details; it helps you arrange them for the target job
const PILL9_Y = 360;
const HERO9 = {x: 540, y: 1010, sc: 0.78};
const Scene9: React.FC<{f: number}> = ({f}) => {
	const pill = pop(f, s(V(23)), 16);
	const absorbed = [0, 1, 2].map((i) => tw(f, V(23) + 0.15 + i * 0.18, 0.7, 0, 1, IN_OUT));
	const glow = tw(f, V(23) + 0.7, 0.3) * (1 - tw(f, V(24) + 0.4, 0.8));
	const cvIn = tw(f, V(24), 0.8);
	const out = tw(f, V(25) - 0.2, 0.4, 0, 1, IN_OUT);
	return (
		<>
			<AIBox y={PILL9_Y} text="رتّب تفاصيلي لوظيفة مدير مشاريع" sc={pill} glow={glow} o={1 - out} dy={-out * 60} />
			{[0, 1, 2].map((i) =>
				absorbed[i] < 1 ? <Row key={i} i={i} f={f} x={lerp(540, 540, absorbed[i])} y={lerp(ROW_Y[i], PILL9_Y, absorbed[i])} sc={lerp(1, 0.12, absorbed[i])} o={1 - tw(f, V(23) + 0.6 + i * 0.18, 0.25)} /> : null,
			)}
			{cvIn > 0 ? (
				<Place x={HERO9.x} y={lerp(HERO9.y - 160, HERO9.y, cvIn)} sc={HERO9.sc} o={Math.min(1, cvIn * 1.5)} clip={`inset(0 0 ${(1 - cvIn) * 100}% 0 round 28px)`}>
					<CV tone="you" name={false} badges={[1, 1, 1, 1]} warm={1} scatter={1 - tw(f, V(24) + 0.3, 1.5, 0, 1, IN_OUT)} job={pop(f, s(V(24) + 2.3), 14)} />
				</Place>
			) : null}
		</>
	);
};

// S10 — review every line; can you explain it in the interview?
const Scene10: React.FC<{f: number}> = ({f}) => {
	const push = tw(f, V(25), 0.8, 0, 1, IN_OUT);
	const tilt = tw(f, V(27) - 0.1, 0.7, 0, 1, IN_OUT);
	const back = tw(f, V(28), 0.8, 0, 1, IN_OUT);
	// zoom on experience lines, tilt to education, then pull back
	const zSc = lerp(lerp(HERO9.sc, 1.6, push), 0.62, back);
	const focusY = lerp(330, 680, tilt);
	const y = lerp(lerp(HERO9.y, 800 - (focusY - CH / 2) * 1.6, push), 820, back);
	const x = lerp(540, 380, back);
	const checks = [0, 1, 2].map((k) => pop(f, s(V(26) + k * 0.3), 14)).concat([3, 4].map((k) => pop(f, s(V(27) + 0.35 + (k - 3) * 0.3), 14)));
	const bub = pop(f, s(V(28) + 0.15), 13);
	return (
		<>
			<Place x={x} y={y} sc={zSc} rot={lerp(0, -3, back)}>
				<CV tone="you" name={false} badges={[1, 1, 1, 1]} warm={1} job={1} checks={checks} />
			</Place>
			<div style={{opacity: push * (1 - back)}}>
				<CaptionBand top={1280} />
			</div>
			<Disc x={810} y={560} size={230} bg={C.accent} icon="message-square-quote" scale={bub} />
			<div style={{position: 'absolute', left: 810 - 140, top: 720, width: 280, display: 'flex', justifyContent: 'center', transform: `scale(${pop(f, s(V(28) + 0.5), 14)})`}}>
				<div style={{padding: '10px 26px', borderRadius: 30, background: C.ink, color: '#fff', fontFamily: arabic, fontSize: 36, fontWeight: 600, direction: 'rtl'}}>بثقة ✓</div>
			</div>
		</>
	);
};

// S11 — nobody knows you better; AI is the small gear, you drive it
const BIG = {x: 450, y: 830, R: 230, teeth: 12};
const SMALL = {x: 450 + 340 * Math.cos(-0.72), y: 830 + 340 * Math.sin(-0.72), R: 130, teeth: 7};
const ORBIT: IconName[] = ['graduation-cap', 'trophy', 'users'];
const Scene11: React.FC<{f: number}> = ({f}) => {
	const t0 = V(29);
	const iris = interpolate(f, [s(t0 - 0.15), s(t0 + 0.45)], [0, 1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: IN_OUT});
	const close = interpolate(f, [s(V(33) - 0.3), s(V(33) + 0.15)], [1300, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: IN_OUT});
	const r = Math.min(iris, close);
	const person = pop(f, s(t0 + 0.2), 15);
	const absorb = tw(f, V(31) - 0.25, 0.45, 0, 1, IN_OUT);
	const toGear = tw(f, V(31) - 0.1, 0.6, 0, 1, IN_OUT);
	const smallIn = tw(f, V(31) + 0.1, 0.7);
	const drive = Math.max(0, f - s(V(32))) * 1.1;
	const cx = lerp(540, BIG.x, toGear);
	const cy = lerp(760, BIG.y, toGear);
	return (
		<AbsoluteFill style={{background: C.ink, clipPath: `circle(${r}px at 540px 760px)`}}>
			{/* person + orbiting proof of experience */}
			{toGear < 1 ? <Disc x={cx} y={cy} size={lerp(260, BIG.R * 2, toGear)} bg={C.accent} icon="user" scale={person} o={1 - toGear} shadow={false} /> : null}
			{ORBIT.map((ic, i) => {
				const a = (f / FPS) * 0.6 + (i * Math.PI * 2) / 3;
				const inP = pop(f, s(t0 + 0.9 + i * 0.3), 15);
				const rad = lerp(270, 0, absorb);
				return absorb < 1 ? <Disc key={ic} x={540 + Math.cos(a) * rad} y={760 + Math.sin(a) * rad} size={120} bg="#fff" icon={ic} iconColor={C.ink} scale={inP * (1 - absorb)} shadow={false} /> : null;
			})}
			{toGear > 0 ? <Gear x={cx} y={cy} R={BIG.R} teeth={BIG.teeth} color={C.accent} rot={drive} sc={lerp(0.56, 1, toGear)} icon="user" /> : null}
			{smallIn > 0 ? <Gear x={SMALL.x + (1 - smallIn) * 400} y={SMALL.y} R={SMALL.R} teeth={SMALL.teeth} color={C.ai} rot={-drive * (BIG.teeth / SMALL.teeth) + 12} icon="bot" /> : null}
			<div style={{position: 'absolute', left: SMALL.x - 160, width: 320, top: SMALL.y - SMALL.R - 110, display: 'flex', justifyContent: 'center', opacity: tw(f, V(31) + 0.5, 0.5)}}>
				<div style={{padding: '8px 26px', borderRadius: 30, background: 'rgba(108,92,231,0.25)', border: `2px solid ${C.ai}`, color: '#fff', fontFamily: arabic, fontSize: 38, fontWeight: 600, direction: 'rtl'}}>أداة مساعدة</div>
			</div>
			<Caption text="محد يفهم شهاداتك وخبراتك أكثر منك" from={s(t0 + 0.35)} to={s(V(31) - 0.1)} y={1440} size={70} weight={600} color="#fff" accent={['منك']} />
			<Caption text="الذكاء الصناعي أداة مساعدة" from={s(V(31) + 0.05)} to={s(V(32) - 0.05)} y={1440} size={70} weight={600} color="#fff" />
			<Caption text="وأنت المحرّك الأساسي" from={s(V(32))} to={s(V(33))} y={1420} size={92} weight={700} color="#fff" accent={['المحرّك', 'الأساسي']} />
		</AbsoluteFill>
	);
};

// S12 — the fingerprint becomes part of your CV
const HERO12 = {x: 540, y: 740, sc: 0.78};
const Scene12: React.FC<{f: number}> = ({f}) => {
	const draw = tw(f, V(33) - 0.1, 1.3, 0, 1, IN_OUT);
	const cvIn = tw(f, V(34) - 0.3, 0.7);
	const fly = tw(f, V(34) + 0.1, 0.75, 0, 1, IN_OUT);
	const dst = cvPt(HERO12.x, HERO12.y, HERO12.sc, CW - 50 - 60, 56 + 60);
	const landed = fly >= 1 ? pop(f, s(V(34) + 0.85), 13) : 0;
	return (
		<>
			{cvIn > 0 ? (
				<Place x={HERO12.x} y={HERO12.y + (1 - cvIn) * 120} sc={HERO12.sc} o={cvIn}>
					<CV tone="you" badges={[1, 1, 1, 1]} warm={1} job={1} avatar={landed} />
				</Place>
			) : null}
			{fly < 1 ? <Fingerprint x={lerp(540, dst.x, fly)} y={lerp(700, dst.y, fly)} size={lerp(400, 70, fly)} draw={draw} /> : null}
			<Caption text="السيرة تحمل اسمك…" from={s(V(33))} to={TOTAL + 60} y={1270} size={74} weight={600} />
			<Caption text="خلّها تحمل بصمتك" from={s(V(34))} to={TOTAL + 60} y={1380} size={100} weight={700} accent={['بصمتك']} />
		</>
	);
};

// screen-space transitions
const BlockWipe: React.FC<{f: number; t: number}> = ({f, t}) => {
	const a = tw(f, t, 0.3, 0, 1, IN_OUT);
	const b = tw(f, t + 0.3, 0.3, 0, 1, IN_OUT);
	if (a <= 0 || b >= 1) return null;
	return <div style={{position: 'absolute', left: 0, width: 1080, height: 1920, top: lerp(1920, 0, a) - b * 1920, background: C.accent}} />;
};
const Shutter: React.FC<{f: number; t: number}> = ({f, t}) => {
	const a = tw(f, t, 0.3, 0, 1, IN_OUT);
	const b = tw(f, t + 0.3, 0.3, 0, 1, IN_OUT);
	if (a <= 0 || b >= 1) return null;
	return (
		<>
			{[0, 1, 2, 3].map((i) => {
				const up = i % 2 === 0;
				const h = 1920 * (a - b);
				const top = up ? (b > 0 ? 1920 * b : 0) : 1920 - 1920 * a;
				return <div key={i} style={{position: 'absolute', left: i * 270, width: 271, top, height: h, background: C.ink}} />;
			})}
		</>
	);
};

export const Video: React.FC = () => {
	const f = useCurrentFrame();
	const vis = (a: number, b: number) => f >= s(a) && f < s(b);
	const musicEnd = TOTAL;
	return (
		<AbsoluteFill style={{background: C.bg, fontFamily: arabic}}>
			<Backdrop />
			{vis(0, 4.75) ? <Scene1 f={f} /> : null}
			{vis(4.3, V(5) + 0.1) ? <Scene2 f={f} /> : null}
			{vis(V(5), V(11)) ? <Scene3 f={f} /> : null}
			{vis(V(11), 18.4) ? <Scene5 f={f} /> : null}
			{vis(18.4, V(14) + 0.1) ? <Scene6 f={f} /> : null}
			{vis(V(14), V(18) + 0.15) ? <Scene7 f={f} /> : null}
			{vis(V(18) + 0.15, V(23) + 0.05) ? <Scene8 f={f} /> : null}
			{vis(V(23), V(25) + 0.05) ? <Scene9 f={f} /> : null}
			{vis(V(25), V(29) + 0.5) ? <Scene10 f={f} /> : null}
			{vis(V(33) - 0.3, 60.1) ? <Scene12 f={f} /> : null}
			{vis(V(29) - 0.15, V(33) + 0.2) ? <Scene11 f={f} /> : null}
			<BlockWipe f={f} t={18.1} />
			<Shutter f={f} t={V(18) - 0.15} />

			{/* captions (screen space) */}
			<Caption text="لو شلنا اسمك من سيرتك…" from={s(V(0))} to={s(V(1) - 0.05)} y={1460} size={70} weight={600} accent={['اسمك']} />
			<Caption text="هل يبقى فيها شيء يميّزك؟" from={s(V(1))} to={s(4.45)} y={1460} size={70} weight={600} accent={['يميّزك؟']} />
			<Caption text="في زمن الذكاء الصناعي" from={s(V(2))} to={s(V(4) - 0.05)} y={1460} size={70} weight={600} accent={['الذكاء', 'الصناعي']} />
			<Caption text="سيرة مرتّبة وكلام احترافي" from={s(V(4))} to={s(V(5) - 0.05)} y={1460} size={70} weight={600} />
			<Caption text="ومعها تتكرر نفس العبارات" from={s(V(5))} to={s(V(6) - 0.1)} y={1440} size={70} weight={600} />
			<Caption text="وين أنت وسط هالكلام؟" from={s(V(9))} to={s(V(11) - 0.05)} y={1440} size={76} weight={700} accent={['أنت']} />
			<Caption text="قبل تطلب من الذكاء الصناعي يكتب سيرتك…" from={s(V(12))} to={s(V(13) - 0.05)} y={1460} size={64} weight={600} />
			<Caption text="اسأل نفسك" from={s(V(13))} to={s(V(14) - 0.05)} y={1460} size={84} weight={700} accent={['نفسك']} />
			<Caption text="أعطه تفاصيلك الحقيقية" from={s(V(23))} to={s(V(24) - 0.05)} y={1500} size={70} weight={600} accent={['الحقيقية']} />
			<Caption text="وخله يرتّبها ويصيغها للوظيفة" from={s(V(24))} to={s(V(25) - 0.05)} y={1500} size={70} weight={600} />
			<Caption text="راجع كل سطر" from={s(V(25))} to={s(V(27) - 0.05)} y={1460} size={76} weight={700} />
			<Caption text="هل هذا يمثّلني؟" from={s(V(27))} to={s(V(28) - 0.05)} y={1460} size={76} weight={700} accent={['يمثّلني؟']} />
			<Caption text="أقدر أشرحه بثقة في المقابلة؟" from={s(V(28))} to={s(V(29) - 0.1)} y={1460} size={68} weight={600} accent={['بثقة']} />

			{/* voice: one chunk per phrase, pauses tightened */}
			{PLACED.map((p, i) => {
				const prevGap = i > 0 ? p.a - SEG[i - 1][1] : 0.3;
				const nextGap = i < SEG.length - 1 ? SEG[i + 1][0] - p.b : 0.4;
				const cut0 = Math.max(0, p.a - Math.min(0.06, prevGap / 2));
				const cut1 = p.b + Math.min(0.14, nextGap / 2);
				return (
					<Sequence key={i} from={s(p.at - (p.a - cut0))} durationInFrames={s(cut1 - cut0)} layout="none">
						<Audio src={staticFile(`${P}voice.mp3`)} trimBefore={s(cut0)} trimAfter={s(cut1)} />
					</Sequence>
				);
			})}
			<Audio
				src={staticFile(`${P}music.wav`)}
				volume={(fr) => interpolate(fr, [0, 30, s(57.8), s(58.3), musicEnd - 50, musicEnd], [0, 0.15, 0.15, 0.32, 0.32, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
			/>

			{/* sound effects — each tied to an action, spaced ≥0.4 s */}
			<Sfx at={s(0.75)} src={`${P}sfx/swipe.wav`} volume={0.22} />
			<Sfx at={s(V(4))} src={`${P}sfx/send.wav`} volume={0.25} />
			<Sfx at={s(V(6))} src={`${P}sfx/tick.wav`} volume={0.22} />
			<Sfx at={s(V(7))} src={`${P}sfx/tick.wav`} volume={0.2} />
			<Sfx at={s(V(8))} src={`${P}sfx/tick.wav`} volume={0.22} />
			<Sfx at={s(V(11) - 1.5)} src={`${P}sfx/riser.wav`} volume={0.2} />
			<Sfx at={s(V(13) + 0.05)} src={`${P}sfx/pop.wav`} volume={0.25} />
			<Sfx at={s(V(15) + 0.15)} src={`${P}sfx/pop.wav`} volume={0.18} />
			<Sfx at={s(V(17) + 0.15)} src={`${P}sfx/pop.wav`} volume={0.18} />
			<Sfx at={s(V(18) - 0.15)} src={`${P}sfx/swipe.wav`} volume={0.22} />
			<Sfx at={s(V(20) - 0.35)} src={`${P}sfx/thud.wav`} volume={0.25} />
			<Sfx at={s(V(22) + 0.9)} src={`${P}sfx/check.wav`} volume={0.22} />
			<Sfx at={s(V(23) + 0.6)} src={`${P}sfx/send.wav`} volume={0.22} />
			<Sfx at={s(V(24) + 0.3)} src={`${P}sfx/shimmer.wav`} volume={0.2} />
			<Sfx at={s(V(26))} src={`${P}sfx/check.wav`} volume={0.2} />
			<Sfx at={s(V(28) + 0.15)} src={`${P}sfx/ding.wav`} volume={0.16} />
			<Sfx at={s(V(29) - 0.2)} src={`${P}sfx/whoosh.wav`} volume={0.22} />
			<Sfx at={s(V(31) + 0.15)} src={`${P}sfx/click.wav`} volume={0.22} />
			<Sfx at={s(V(34) + 0.85)} src={`${P}sfx/shimmer.wav`} volume={0.18} />
		</AbsoluteFill>
	);
};

// exported for checks
export const TIMES = PLACED.map((p) => +p.at.toFixed(2));
