import json, pathlib
root = pathlib.Path(__file__).parent
meta = json.load(open(root/'screens_meta.json'))
js = '\n'.join((root/'js'/f).read_text() for f in ['core.js','art.js','content.js','child1.js','child2.js','parent.js','teacher.js','flows.js'])
js = js.replace('</script', '<\\/script')
out = (root/'head.html').read_text() + '\n' + (root/'body.html').read_text() + \
  '\n<script>window.__META__=' + json.dumps(meta, ensure_ascii=False) + ';</script>\n<script>\n' + js + '\n</script>\n'
(root/'trailbuddies-prototype.html').write_text(out)
print(len(out)//1024, 'KB')
