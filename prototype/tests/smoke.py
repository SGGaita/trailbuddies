import sys, json
from playwright.sync_api import sync_playwright
URL = 'file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','trailbuddies-prototype.html'))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1500, 'height': 950})
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append('CONSOLE ' + m.text))
    pg.goto(URL); pg.wait_for_timeout(500)
    apps = ['learner', 'parent', 'teacher', 'staff']
    for a in apps:
        pg.click(f'#apps [data-app="{a}"]'); pg.wait_for_timeout(150)
        n = pg.locator('#flows [data-step]').count()
        for i in range(n):
            before = len(errs)
            btn = pg.locator('#flows [data-step]').nth(i)
            label = btn.inner_text().replace('\n', ' ')
            btn.click(); pg.wait_for_timeout(120)
            scr = pg.evaluate('U.screen')
            html = pg.inner_html('#scr')
            cur = pg.locator('#flows [aria-current="step"]').count()
            app_now = pg.evaluate('U.app')
            ok = len(html) > 200 and len(errs) == before
            if not ok or cur == 0: print('ISSUE', a, label, scr, 'len', len(html), 'cur', cur, errs[before:])
            if app_now != a:  # cross app step switched app, go back
                pg.click(f'#apps [data-app="{a}"]'); pg.wait_for_timeout(100)
        print(a, n, 'steps ok')
    # play a unit lesson end to end with real taps where possible, else good()
    pg.evaluate("S.active='zawadi'; startLesson({kind:'unit',unit:'a1',n:1})")
    for k in range(40):
        pg.wait_for_timeout(150)
        if pg.evaluate('U.screen') != 'C07': break
        t = pg.evaluate("(()=>{const x=U.lesson.exs[U.lesson.i];return x.type+'|'+(x.target?x.target.id:'')})()")
        typ, tid = t.split('|')
        if typ == 'tap' and pg.locator(f'#scr [data-act="pick"][data-id="{tid}"]').count():
            pg.click(f'#scr [data-act="pick"][data-id="{tid}"]'); pg.wait_for_timeout(1300)
        else:
            pg.evaluate("U.lesson.lock=false; good(null)"); pg.wait_for_timeout(1300)
    print('after lesson:', pg.evaluate('U.screen'), pg.evaluate('JSON.stringify({s:U.result&&U.result.stars, tr:U.result&&U.result.tr})'))
    # cross-app: publish a lesson then see it on island
    pg.click('#apps [data-app="parent"]'); pg.wait_for_timeout(100)
    pg.evaluate("runStep(FLOWS.parent[2].steps[2])"); pg.wait_for_timeout(100)
    pg.click('#scr [data-act="publish"]'); pg.wait_for_timeout(100)
    pg.click('#scr [data-act="seeIsland"]'); pg.wait_for_timeout(150)
    print('island has kitchen:', 'Our kitchen' in pg.inner_html('#scr'), pg.evaluate('U.screen'))
    # wish ask -> approve
    pg.evaluate("runStep(FLOWS.parent[1].steps[2])"); pg.wait_for_timeout(100)
    pg.click('#scr [data-act="wishOk"]'); pg.wait_for_timeout(100)
    pg.evaluate("as('zawadi'); go('C21')"); pg.wait_for_timeout(100)
    print('wish approved shows:', 'Approved' in pg.inner_html('#scr'))
    # award badge -> celebration
    pg.evaluate("runStep(FLOWS.parent[1].steps[3])"); pg.wait_for_timeout(100)
    if pg.locator('#scr [data-act="award"]').count():
        pg.locator('#scr [data-act="award"]').first.click(); pg.wait_for_timeout(100)
        pg.click('#scr [data-act="seeCele"]'); pg.wait_for_timeout(150)
    print('celebration:', pg.evaluate('U.screen'))
    # teacher assign -> island
    pg.evaluate("go('T03')"); pg.click('#scr [data-act="aU"][data-u="n2"]'); pg.click('#scr [data-act="assign"]'); pg.wait_for_timeout(100)
    pg.click('#scr [data-act="seeAssign"]'); pg.wait_for_timeout(100)
    print('assign on island:', pg.evaluate('U.screen'), pg.evaluate("S.assignments.length"))
    # games
    pg.evaluate("go('C16')"); pg.wait_for_timeout(100)
    pg.evaluate("U.f.mem.cards.forEach((c,i)=>{})")
    pg.screenshot(path='learner.png')
    pg.evaluate("runStep(FLOWS.parent[1].steps[0])"); pg.wait_for_timeout(200); pg.screenshot(path='parent.png')
    pg.evaluate("go('T04')"); pg.wait_for_timeout(200); pg.screenshot(path='teacher.png')
    pg.evaluate("runStep(FLOWS.learner[1].steps[3])"); pg.wait_for_timeout(200); pg.screenshot(path='hint.png')
    # mobile
    m = b.new_page(viewport={'width': 390, 'height': 844})
    m.on('pageerror', lambda e: errs.append('M ' + str(e)))
    m.goto(URL); m.wait_for_timeout(400)
    print('mobile overflow:', m.evaluate('document.documentElement.scrollWidth'), 'vs 390')
    m.screenshot(path='mobile.png', full_page=False)
    print('ERRORS', len(errs)); [print(e) for e in errs[:20]]
    b.close()
