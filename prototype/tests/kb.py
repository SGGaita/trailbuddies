from playwright.sync_api import sync_playwright
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':1500,'height':1000}); errs=[]
  pg.on('pageerror',lambda e: errs.append(str(e)))
  pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','trailbuddies-prototype.html'))); pg.wait_for_timeout(400)
  for dev in ['phone','web']:
    pg.click('#apps [data-app="learner"]'); pg.click(f'#devs [data-dev="{dev}"]')
    pg.evaluate("S.active='zawadi'; startLesson({kind:'unit',unit:'a1',n:2})")
    for k in range(30):
      pg.wait_for_timeout(150)
      if pg.evaluate('U.screen')!='C07': break
      t=pg.evaluate("(()=>{const x=U.lesson.exs[U.lesson.i];return x.type+'|'+(x.target?x.target.id:'')})()").split('|')
      if t[0]=='tap':
        idx=pg.evaluate(f"[...document.querySelectorAll('#exarea .tile:not(.gone)')].findIndex(e=>e.dataset.id==='{t[1]}')")
        if dev=='web': pg.keyboard.press(str(idx+1))
        else: pg.click(f'#exarea [data-id="{t[1]}"]')
      else: pg.evaluate('U.lesson.lock=false; good(null)')
      pg.wait_for_timeout(1300)
    print(dev,'->',pg.evaluate('U.screen'), pg.evaluate('U.result.stars'))
  print(errs); b.close()
