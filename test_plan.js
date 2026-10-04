// Vérifie le moteur de niveau, le plan, les chronos et le coach (node test_plan.js)
const fs = require('fs');
const assert = require('assert');

const code = fs.readFileSync('index.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

// Stub DOM minimal : le script n'écrit que dans des éléments
const makeEl = () => ({
    textContent: '', innerHTML: '', value: '', className: '', disabled: false, dataset: {},
    style: {}, closest: () => null, children: [],
    addEventListener() {}, appendChild() {},
    classList: { add() {}, remove() {}, toggle() {} }
});
const els = {};
global.document = {
    getElementById: id => (els[id] = els[id] || makeEl()),
    createElement: () => makeEl(),
    querySelectorAll: () => []
};
global.localStorage = {
    s: {},
    getItem(k) { return this.s[k] ?? null; },
    setItem(k, v) { this.s[k] = String(v); },
    removeItem(k) { delete this.s[k]; }
};
global.navigator = {};
global.window = { scrollTo() {}, addEventListener() {} };
global.confirm = () => true;

// Programme de Matthieu : salle mardi et jeudi, semaines de bloc et de renfo à la maison
const api = {};
new Function('api', code + [
    'api.get = () => ({ GRADES, PLAN_MUR, PLAN_BLOC, plan, murWeek, renfoDay, fingerDay, homeItems, weekType, SETUP, DAYS, cfg, phase, deload, vol, vol2, fingerSets, fingerWork, fingerRest, homeSets, homeRest, homeMinutes, seqFinger, seqHome, autoWeek, syncWeek, weakProfile, profileStats, profileTable, coachVerdict, cycleRate, fingerBest, currentWeek: () => currentWeek });',
    'api.render = () => render();',
    'api.setLevel = n => setLevel(n);',
    'api.day = (n, from) => pickDay(n, from);',
    'api.check = i => toggleItem(i);',
    'api.finish = () => finishDay();',
    'api.start = iso => { store("climbingStart", iso); store("climbingWeekOffset", 0); syncWeek(); };',
    'api.logFinger = () => { document.getElementById("fingerKg").value = "12"; logFinger(); };',
    'api.newCycle = n => newCycle(n);',
    'api.nudgeWeek = n => nudgeWeek(n);'
].join('\n'))(api);

const G = api.get();
const iso = d => d.toLocaleDateString('sv');
const back = n => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return iso(d);
};

/* ---------- objectif par défaut : flash 6b sur une base 6a ---------- */
assert.ok(!G.GRADES.includes('6d') && !G.GRADES.includes('7d'), 'pas de cotation en "d" dans l\'échelle');
assert.strictEqual(G.cfg().grade, '6b', 'l\'objectif par défaut est le flash 6b');
assert.strictEqual(G.cfg().cruise, '6a', 'sa base à vue est le 6a');
assert.strictEqual(G.cfg().easy, '5c', 'l\'échauffement est deux crans en dessous');
api.setLevel(1);
assert.strictEqual(G.cfg().grade, '5a', 'niveau 1 = 5a');
api.setLevel(9);
assert.strictEqual(G.cfg().grade, '7c', 'niveau 9 = 7c');

/* ---------- alternance : 6 semaines de salle, 6 semaines de bloc ---------- */
const weeksMur = [], weeksBloc = [];
for (let w = 1; w <= 12; w++) {
    api.start(back((w - 1) * 7 + 3));
    (G.murWeek() ? weeksMur : weeksBloc).push(w);
}
assert.deepStrictEqual(weeksMur, [1, 3, 5, 7, 9, 11], 'les semaines de salle doivent être les semaines impaires');
assert.deepStrictEqual(weeksBloc, [2, 4, 6, 8, 10, 12], 'les semaines de bloc doivent être les semaines paires');
assert.strictEqual(G.weekType(), 'Semaine de bloc', 'la semaine 12 est une semaine de bloc');
console.log('ok — objectif flash 6b sur base 6a, alternance 6 semaines de salle / 6 de bloc');

/* ---------- la semaine de salle : deux jours en salle, jamais plus ---------- */
api.start(iso(new Date()));          // semaine 1 : semaine de salle
const murDays = G.PLAN_MUR.map((d, i) => ({ day: G.DAYS[i], kind: d.kind })).filter(x => x.kind === 'mur');
assert.deepStrictEqual(murDays.map(x => x.day), ['Mardi', 'Jeudi'], 'les seuls jours de salle sont mardi et jeudi');
assert.strictEqual(G.PLAN_MUR.filter(d => d.kind === 'maison').length, 2, 'deux séances à la maison en semaine de salle');
assert.strictEqual(G.fingerDay(), 0, 'le fingerboard est le lundi en semaine de salle');
assert.strictEqual(G.renfoDay(), 4, 'le renfo est le vendredi en semaine de salle');

/* ---------- la semaine de bloc : 2 blocs + du renfo, aucune salle ---------- */
api.start(back(7));                  // semaine 2 : semaine de bloc
assert.strictEqual(G.fingerDay(), 5, 'le fingerboard tombe le samedi en semaine de bloc');
assert.strictEqual(G.renfoDay(), 1, 'le renfo tombe le mardi en semaine de bloc');
assert.strictEqual(G.PLAN_BLOC.filter(d => d.kind === 'bloc').length, 2, 'deux séances de bloc par semaine');
assert.ok(!G.PLAN_BLOC.some(d => d.kind === 'mur'), 'aucune séance en salle pendant la semaine de bloc');
assert.deepStrictEqual(
    G.PLAN_BLOC.map((d, i) => ({ day: G.DAYS[i], bloc: d.kind === 'bloc' })).filter(x => x.bloc).map(x => x.day),
    ['Lundi', 'Jeudi'], 'les deux blocs sont le lundi et le jeudi');

/* ---------- le jeudi porte les essais 6b, le mardi le volume ---------- */
api.start(back(3));
api.setLevel(5);
const tuesday = G.PLAN_MUR[1].items(G.cfg());
const thursday = G.PLAN_MUR[3].items(G.cfg());
assert.ok(tuesday.some(it => it.p.some(p => p[1] === '6a')), 'le mardi doit grimper du 6a');
assert.ok(!tuesday.some(it => it.n.includes('c\'est LA séance')), 'le mardi ne doit pas être la séance clé');
assert.ok(thursday.some(it => it.t.includes('6b')), 'le jeudi doit contenir les essais 6b');
assert.ok(thursday.some(it => it.t.includes('Sortie propre')), 'le jeudi doit finir propre, pas en pompant');
assert.ok(G.vol2(G.cfg()) < G.vol(G.cfg()), 'le jeudi doit avoir moins de voies que le mardi');
assert.ok(G.homeItems().every(it => it.t.length && it.rest >= 45), 'le renfo doit être complet');
console.log('ok — mardi = volume 6a, jeudi = flash 6b, 2 blocs + renfo la semaine sans salle');

for (let lv = 1; lv <= 9; lv++) {
    for (let w = 1; w <= 12; w++) {
        api.setLevel(lv);
        api.start(back((w - 1) * 7 + 3));           // en plein milieu de la semaine w
        assert.strictEqual(G.currentWeek(), w, 'semaine auto fausse en S' + w + ' niveau ' + lv);
        [G.PLAN_MUR, G.PLAN_BLOC].forEach(P => P.forEach((day, i) => {
            api.day(i + 1);
            const items = day.items(G.cfg());
            assert.ok(items.length > 0, day.d + ' : pas d\'exercices');
            items.forEach(it => it.p.forEach(([k, v]) => {
                assert.ok(String(v ?? '').length, day.d + ' : paramètre vide ' + k);
            }));
        }));
    }
}
console.log('ok — 2 programmes complets sur 9 niveaux × 12 semaines × 7 jours');

/* ---------- bornes de semaine ---------- */
api.start(back(7 * 40));
assert.strictEqual(G.currentWeek(), 12, 'la semaine doit être plafonnée à 12');
assert.strictEqual(G.autoWeek(), 12, 'autoWeek doit plafonner');
api.start(iso(new Date()));
assert.strictEqual(G.currentWeek(), 1, 'un cycle démarré aujourd\'hui est en semaine 1');
api.start(back(7 * 3));
api.nudgeWeek(2);
assert.strictEqual(G.currentWeek(), 6, 'l\'ajustement manuel doit décaler la semaine');
assert.strictEqual(G.deload(), false, 'seule la semaine 12 est une décharge');
api.nudgeWeek(4);
assert.strictEqual(G.currentWeek(), 10, 'l\'ajustement doit suivre le déplacement demandé');
api.nudgeWeek(20);
assert.strictEqual(G.currentWeek(), 12, 'l\'ajustement ne doit pas dépasser 12');
assert.strictEqual(G.deload(), true, 'la semaine 12 est la décharge de fin de cycle');
assert.strictEqual(G.weekType(), 'Semaine de bloc', 'la décharge tombe sur une semaine de bloc');
console.log('ok — semaine bornée 1-12, ajustement manuel sans dépassement, décharge en S12');

/* ---------- séquence fingerboard ---------- */
api.setLevel(5);
api.start(iso(new Date()));
const f = G.seqFinger();
assert.strictEqual(f[0].k, 'count');
assert.strictEqual(f[0].d, G.SETUP, 'la première phase doit être la mise en place');
assert.ok(f[0].t.includes('Mise en place'), 'la première phase doit être nommément la mise en place');
assert.strictEqual(f[1].d, G.fingerWork(), 'la deuxième phase est le travail');
assert.strictEqual(f[2].d, G.fingerRest(), 'la troisième phase est le repos');
assert.strictEqual(f.length, G.fingerSets() * 3 - 1, 'il manque une phase dans la séquence fingerboard');
assert.ok(!f.some(p => p.t.includes('Mise en place') && p.d !== G.SETUP), 'toutes les mises en place durent 10 s');
console.log('ok — fingerboard : mise en place ' + G.SETUP + ' s avant chaque série (' + f.length + ' phases)');

/* ---------- séquence du renfo, quel que soit le jour ---------- */
api.start(iso(new Date()));          // semaine 1 : renfo le vendredi
assert.strictEqual(G.renfoDay(), 4);
let r = G.seqHome();
let items = G.homeItems();
let waits = r.filter(p => p.k === 'wait');
let counts = r.filter(p => p.k === 'count');
assert.strictEqual(waits.length, items.reduce((n, it) => n + it.sets, 0), 'un passage par série');
assert.strictEqual(waits.length - 1, counts.length, 'chaque repos doit suivre une série, sauf la dernière');
items.forEach(it => {
    assert.ok(it.rest >= 45, 'repos trop court sur ' + it.t);
    assert.ok(r.some(p => p.k === 'count' && p.d === it.rest), 'repos manquant pour ' + it.t);
});
assert.ok(counts.every(p => p.float), 'chaque repos doit afficher le chrono flottant');
assert.ok(G.homeMinutes() > 10, 'durée de séance maison incohérente');

api.start(back(7));                  // semaine 2 : plus de salle, renfo le mardi
assert.strictEqual(G.renfoDay(), 1);
assert.strictEqual(G.seqHome().filter(p => p.k === 'wait').length, items.reduce((n, it) => n + it.sets, 0),
    'la séquence doit suivre le jour de renfo de la semaine');
console.log('ok — séance de renfo : ' + waits.length + ' séries, ' + counts.length + ' repos (tractions ' +
    G.homeRest(0) + ' s, pompes ' + G.homeRest(1) + ' s), environ ' + G.homeMinutes() + ' min, le vendredi ou le mardi');

/* ---------- force de doigt ---------- */
localStorage.removeItem('climbingFinger');
api.logFinger();
let log = JSON.parse(localStorage.getItem('climbingFinger'));
assert.strictEqual(log.length, 1);
assert.strictEqual(log[0].kg, 12);
assert.strictEqual(log[0].hold, G.cfg().hold);
assert.strictEqual(G.fingerBest()[G.cfg().hold], 12, 'le record doit être 12 kg');
localStorage.setItem('climbingFinger', JSON.stringify([
    { date: back(10), hold: '10mm', kg: 8, sets: 5, work: 7, week: 1 },
    { date: back(2), hold: '10mm', kg: 14, sets: 5, work: 7, week: 2 },
    { date: back(1), hold: '15mm', kg: 5, sets: 5, work: 7, week: 2 }
]));
assert.strictEqual(G.fingerBest()['10mm'], 14, 'le record retient le meilleur poids');
assert.strictEqual(G.fingerBest()['15mm'], 5, 'chaque prise a son propre record');
console.log('ok — force de doigt : log du poids et record par prise');

/* ---------- profil faible ---------- */
api.start(iso(new Date()));          // semaine de salle pour tester le priorisage du jeudi
localStorage.removeItem('climbingRoutes');
assert.strictEqual(G.weakProfile(), null, 'aucun profil faible sans données');
localStorage.setItem('climbingRoutes', JSON.stringify([
    { name: 'a', grade: '6a', profile: 'Dévers', status: 'fail', date: new Date().toISOString() },
    { name: 'b', grade: '6a', profile: 'Dévers', status: 'work', date: new Date().toISOString() },
    { name: 'c', grade: '6a', profile: 'Dalle', status: 'flash', date: new Date().toISOString() },
    { name: 'd', grade: '6a', profile: 'Dalle', status: 'flash', date: new Date().toISOString() }
]));
assert.strictEqual(G.weakProfile().p, 'Dévers', 'le profil le moins flashé doit être désigné');
assert.strictEqual(G.weakProfile().f, 0);
assert.strictEqual(G.profileStats().length, 2, 'les deux profils doivent être comptés');
assert.ok(G.PLAN_MUR[3].brief(G.cfg()).includes('dévers'), 'le brief du jeudi doit citer la priorité');
assert.ok(G.PLAN_MUR[3].items(G.cfg())[1].p.some(p => p[1] === 'Dévers'), 'les essais flash doivent prioriser le profil faible');
assert.ok(G.profileTable().includes('Dévers'), 'le bilan doit lister les taux par profil');
api.render();
assert.ok(els.stProfiles.innerHTML.includes('Dévers'), 'la carte bilan doit afficher les profils');
localStorage.setItem('climbingRoutes', JSON.stringify([
    { name: 'a', grade: '6a', profile: 'Toit', status: 'fail', date: new Date().toISOString() },
    { name: 'b', grade: '6a', profile: 'Toit', status: 'fail', date: new Date().toISOString() }
]));
assert.strictEqual(G.weakProfile(), null, 'un seul profil ne permet pas de conclure');
console.log('ok — profil faible : désigné seulement avec 2 profils et 2 voies chacun, priorisé au jeudi');

/* ---------- coach ---------- */
// Le coach juge les tentatives au niveau objectif (6b), pas les voies à vue
const routesAt = (statuses, grade = '6b', days = 4) => statuses.map((status, i) => ({
    name: 'v' + i,
    grade,
    profile: 'Dévers',
    status,
    date: iso(new Date(Date.now() - (i % days) * 864e5)) + 'T10:00:00.000Z'
}));
api.setLevel(5);
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(['flash', 'flash', 'work'])));
let v = G.coachVerdict();
assert.ok(v.need !== undefined, '3 voies ne suffisent pas pour un avis');
assert.strictEqual(v.need, 3);
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(Array(8).fill('flash'))));
v = G.coachVerdict();
assert.ok(v.up, '8 flash à la cotation cible doivent proposer de monter');
assert.strictEqual(v.rate, 1);
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(Array(8).fill('fail'))));
assert.ok(G.coachVerdict().down, '0 % de flash doit proposer de descendre');
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(['flash', 'flash', 'flash', 'work', 'fail'])));
assert.ok(G.coachVerdict().hold, 'un taux intermédiaire doit conserver le niveau');
const others = routesAt(Array(8).fill('flash'), '6c');
localStorage.setItem('climbingRoutes', JSON.stringify(others));
assert.ok(G.coachVerdict().need !== undefined, 'les voies d\'une autre cotation ne comptent pas');
const flashAView = routesAt(Array(8).fill('flash'), '6a');
localStorage.setItem('climbingRoutes', JSON.stringify(flashAView));
assert.ok(G.coachVerdict().need !== undefined, 'flasher du 6a n\'est pas flasher du 6b : le coach ne compte pas les voies à vue');
const stale = routesAt(Array(8).fill('flash')).map(x => ({ ...x, date: x.date.slice(0, 10) }));
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(Array(8).fill('flash')).map((x, i) => ({ ...x, date: back(40 + i) }))));
assert.ok(G.coachVerdict().need !== undefined, 'les voies de plus de 3 semaines sont ignorées');
console.log('ok — coach : 5 voies et 3 jours minimum, à la bonne cotation, moins de 3 semaines');

/* ---------- fin de cycle ---------- */
localStorage.setItem('climbingRoutes', JSON.stringify(routesAt(Array(8).fill('flash'))));
api.setLevel(5);
assert.ok(G.cycleRate().rate === 1, 'le taux du cycle doit être calculé');
api.start(back(7 * 11));
api.setLevel(5);
api.render();
assert.ok(els.cycleCard.innerHTML.includes('Cycle de 12 semaines terminé'), 'la carte de fin de cycle doit apparaître en S12');
assert.ok(els.cycleCard.innerHTML.includes('monter'), 'un cycle réussi doit proposer de monter');
api.start(back(7 * 5));
api.render();
assert.strictEqual(els.cycleCard.innerHTML, '', 'pas de carte de fin de cycle avant S12');
api.start(back(7 * 11));
api.setLevel(5);
api.newCycle(1);
assert.strictEqual(JSON.parse(localStorage.getItem('climbingStart')), iso(new Date()), 'le cycle doit repartir d\'aujourd\'hui');
assert.strictEqual(JSON.parse(localStorage.getItem('climbingLevel')), 6, 'un cycle réussi doit monter d\'un cran');
assert.strictEqual(G.currentWeek(), 1, 'le nouveau cycle doit repartir en semaine 1');
api.newCycle(0);
assert.strictEqual(JSON.parse(localStorage.getItem('climbingLevel')), 6, 'rester au même niveau ne change rien');
console.log('ok — fin de cycle : remise à zéro du cycle et montée d\'un cran si le taux est bon');

/* ---------- checklist ---------- */
localStorage.removeItem('climbingRoutes');
localStorage.removeItem('climbingSessions');
api.setLevel(5);
api.start(iso(new Date()));
api.day(2);
const nb = G.PLAN_MUR[1].items(G.cfg()).length;
api.check(0);
assert.strictEqual(els.todayPct.textContent, Math.round(1 / nb * 100) + ' %', 'la progression ne suit pas');
api.finish();
assert.strictEqual(els.todayPct.textContent, '100 %', 'la séance ne se valide pas');
assert.strictEqual(JSON.parse(localStorage.getItem('climbingSessions')).length, 1, 'séance non enregistrée');
assert.ok(els.weekStrip.innerHTML.includes('✓'), 'la semaine ne marque pas la séance faite');
console.log('ok — checklist, validation de séance et suivi dans la semaine');