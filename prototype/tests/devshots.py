import sys, os
from playwright.sync_api import sync_playwright
from PIL import Image
URL='file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','trailbuddies-prototype.html'))
combos=[('teacher','tablet'),('teacher','web'),('learner','phone'),('learner','web'),('learner','tablet'),('parent','tablet'),('parent','web'),('parent','phone')]
only=sys.argv[1:] 
os.makedirs('shots',exist_ok=True); errs=[]
OVF="""(()=>{const s=document.getElementById('scr').getBoundingClientRect();const k=s.width/document.getElementById('scr').offsetWidth;let bad=[];document.querySelectorAll('#scr *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.height&&(r.right>s.right+2||r.left<s.left-2)){let p=e.parentElement,clip=false;while(p&&p.id!=='scr'){const cs=getComputedStyle(p);if(cs.overflowX!=='visible'){const pr=p.getBoundingClientRect();if(pr.right<=s.right+2&&pr.left>=s.left-2){clip=true;break}}p=p.parentElement}if(!clip)bad.push((e.className&&e.className.baseVal===undefined?e.className:e.tagName)+'')}});return [...new Set(bad)].slice(0,4)})()"""
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':1600,'height':1100})
  pg.on('pageerror',lambda e: errs.append(str(e)))
  pg.goto(URL); pg.wait_for_timeout(500)
  for app,dev in combos:
    if only and f'{app}-{dev}' not in only: continue
    pg.click(f'#apps [data-app="{app}"]'); pg.wait_for_timeout(100)
    pg.click(f'#devs [data-dev="{dev}"]'); pg.wait_for_timeout(100)
    n=pg.locator('#flows [data-step]').count(); files=[]
    for i in range(n):
      e0=len(errs)
      pg.evaluate(f"(()=>{{const s=[].concat(...FLOWS['{app}'].map(g=>g.steps))[{i}];runStep(s)}})()"); pg.wait_for_timeout(250)
      if pg.evaluate('U.app')!=app: continue
      ov=pg.evaluate(OVF)
      f=f'shots/{app}-{dev}-{i:02d}.png'; pg.locator('#dev').screenshot(path=f); files.append(f)
      if ov or len(errs)>e0: print(app,dev,i,pg.evaluate('U.screen'),'OVERFLOW' if ov else '',ov,errs[e0:])
    # contact sheet
    ims=[Image.open(f) for f in files]; w=max(i.width for i in ims); h=max(i.height for i in ims)
    cols=6 if dev=='phone' else 4; sc=0.5 if dev!='phone' else 0.6
    tw,th=int(w*sc),int(h*sc); rows=(len(ims)+cols-1)//cols
    for part in range(0,rows,3):
      sub=ims[part*cols:(part+3)*cols]; rr=(len(sub)+cols-1)//cols
      sheet=Image.new('RGB',(tw*cols,th*rr),'white')
      for k,im in enumerate(sub): sheet.paste(im.resize((int(im.width*sc),int(im.height*sc))),((k%cols)*tw,(k//cols)*th))
      sheet.save(f'sheet-{app}-{dev}-{part//3}.png')
    print(app,dev,'screens',len(files))
  b.close()
print('errors',errs[:5])
