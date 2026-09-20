"""build-docx.py: Mengubah laporan/laporan.html menjadi laporan Word yang bisa diedit.

Jalankan `npm run report` lebih dulu (membuat laporan.html dan screenshot), lalu:
    npm run docx
Butuh pandoc. Hasil: laporan/Laporan-K1-Playfair-Cipher.docx
"""
import os
import re
import subprocess
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_DIR = os.path.join(ROOT, 'laporan')
HTML = os.path.join(REPORT_DIR, 'laporan.html')
OUT = os.path.join(REPORT_DIR, 'Laporan-K1-Playfair-Cipher.docx')
FILTER = os.path.join(ROOT, 'tools', 'docx', 'pagebreak.lua')

FONT = 'Times New Roman'


def preprocess(html):
    html = re.sub(r'<title>.*?</title>', '', html, flags=re.S)
    html = re.sub(r'<style>.*?</style>', '', html, flags=re.S)
    # "BAB I<small>PENDAHULUAN</small>" -> dua baris dalam satu judul
    html = re.sub(r'<h1>(.*?)<small>(.*?)</small></h1>', r'<h1>\1<br>\2</h1>', html)
    # Setiap bab dimulai di halaman baru
    html = html.replace('<section class="chapter">', '<div class="pagebreak"></div>\n<section class="chapter">')
    # Paragraf rata tengah
    for cls in ('title', 'subtitle', 'inst'):
        html = html.replace(f'<div class="{cls}">', f'<div class="{cls}" data-custom-style="Center Bold">' if cls != 'subtitle' else f'<div class="{cls}" data-custom-style="Center">')
    html = html.replace('<p class="members-note">', '<p data-custom-style="Center">')
    html = html.replace('<h2 class="members-title">', '<h2>')
    html = html.replace('<p class="tcap">', '<p data-custom-style="Table Caption">')
    # Penjelasan gambar dipindah ke luar <figure> agar gambar tampil penuh di atasnya
    html = re.sub(r'(<figure>.*?</figcaption>)(<p class="fignote">.*?</p>)(</figure>)', r'\1\3\2', html, flags=re.S)
    html = html.replace('<p class="fignote">', '<p>')

    # Diagram alur -> satu paragraf "A → B → C" rata tengah
    def flow(m):
        boxes = re.findall(r'<span class="box">(.*?)</span>', m.group(1), flags=re.S)
        text = ' → '.join(re.sub(r'\s*<br>\s*', ' ', b).strip() for b in boxes)
        return f'<p data-custom-style="Flow">{text}</p>'
    html = re.sub(r'<div class="flow">(.*?)</div>', flow, html, flags=re.S)
    # Kotak catatan -> paragraf biasa
    html = re.sub(r'<div class="box-note">(.*?)</div>', r'<p>\1</p>', html, flags=re.S)
    return html


PPR_ORDER = ['pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 'widowControl', 'numPr',
             'suppressLineNumbers', 'pBdr', 'shd', 'tabs', 'suppressAutoHyphens', 'kinsoku', 'wordWrap',
             'overflowPunct', 'topLinePunct', 'autoSpaceDE', 'autoSpaceDN', 'bidi', 'adjustRightInd', 'snapToGrid',
             'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 'textDirection',
             'textAlignment', 'textboxTightWrap', 'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange']
RPR_ORDER = ['rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline',
             'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 'w',
             'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign',
             'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath']


def children(inner):
    """Pisahkan elemen anak langsung (<w:x/> atau <w:x>...</w:x>) menjadi daftar (nama, xml)."""
    out, pos = [], 0
    pattern = re.compile(r'<w:(\w+)\b[^>]*?(/>|>)', re.S)
    while True:
        m = pattern.search(inner, pos)
        if not m:
            break
        name = m.group(1)
        if m.group(2) == '/>':
            end = m.end()
        else:
            close = inner.index('</w:%s>' % name, m.end())
            end = close + len('</w:%s>' % name)
        out.append((name, inner[m.start():end]))
        pos = end
    return out


def merge_props(inner, extra, order):
    """Gabungkan properti tambahan ke dalam isi pPr/rPr, menimpa yang bernama sama, lalu urutkan sesuai skema."""
    items = dict(children(inner))
    items.update(dict(children(extra)))
    rank = {n: i for i, n in enumerate(order)}
    return ''.join(xml for _, xml in sorted(items.items(), key=lambda kv: rank.get(kv[0], len(order))))


def set_block(body, tag, extra, order):
    m = re.search(r'<w:%s>(.*?)</w:%s>' % (tag, tag), body, flags=re.S)
    if m:
        return body[:m.start()] + '<w:%s>%s</w:%s>' % (tag, merge_props(m.group(1), extra, order), tag) + body[m.end():]
    return None


STYLE_OVERRIDES = {
    'Center': ('<w:spacing w:before="0" w:after="120"/><w:jc w:val="center"/>', ''),
    'Center Bold': ('<w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/>', '<w:b/><w:sz w:val="28"/>'),
    'Flow': ('<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="4" w:color="808080"/></w:pBdr><w:spacing w:before="120" w:after="160"/><w:jc w:val="center"/>',
             '<w:b/><w:sz w:val="21"/>'),
}


def build_reference(path):
    default = subprocess.run(['pandoc', '--print-default-data-file', 'reference.docx'], check=True, capture_output=True).stdout
    src = path + '.src'
    with open(src, 'wb') as f:
        f.write(default)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/styles.xml':
                data = patch_styles(data.decode('utf8')).encode('utf8')
            elif item.filename == 'word/document.xml':
                data = patch_page(data.decode('utf8')).encode('utf8')
            zout.writestr(item, data)
    os.remove(src)


def patch_styles(s):
    # Font dasar Times New Roman 12 pt, semua warna teks hitam
    s = re.sub(r'<w:rFonts [^>]*/>', f'<w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}" w:eastAsia="{FONT}" w:cs="{FONT}" />', s)
    s = re.sub(r'<w:color [^>]*/>', '<w:color w:val="000000" />', s)
    m = re.search(r'(<w:rPrDefault>\s*<w:rPr>)(.*?)(</w:rPr>)', s, flags=re.S)
    s = s[:m.start()] + m.group(1) + merge_props(m.group(2), '<w:sz w:val="24"/><w:szCs w:val="24"/>', RPR_ORDER) + m.group(3) + s[m.end():]

    def patch(style_id, ppr_extra='', rpr_extra=''):
        nonlocal s
        m = re.search(r'(<w:style [^>]*w:styleId="%s"[^>]*>)(.*?)(</w:style>)' % re.escape(style_id), s, flags=re.S)
        if not m:
            return
        body = m.group(2)
        if ppr_extra:
            body = set_block(body, 'pPr', ppr_extra, PPR_ORDER) or body.replace('<w:qFormat />', '<w:qFormat /><w:pPr>%s</w:pPr>' % merge_props('', ppr_extra, PPR_ORDER), 1)
        if rpr_extra:
            body = set_block(body, 'rPr', rpr_extra, RPR_ORDER) or body + '<w:rPr>%s</w:rPr>' % merge_props('', rpr_extra, RPR_ORDER)
        s = s[:m.start()] + m.group(1) + body + m.group(3) + s[m.end():]

    for sid in ('BodyText', 'FirstParagraph'):
        patch(sid, '<w:spacing w:before="0" w:after="120" w:line="336" w:lineRule="auto"/><w:jc w:val="both"/>')
    patch('Compact', '<w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>')
    patch('Heading1', '<w:spacing w:before="0" w:after="240"/><w:jc w:val="center"/>', '<w:b/><w:color w:val="000000"/><w:sz w:val="28"/><w:szCs w:val="28"/>')
    patch('Heading2', '<w:spacing w:before="240" w:after="120"/>', '<w:b/><w:color w:val="000000"/><w:sz w:val="26"/><w:szCs w:val="26"/>')
    patch('Heading3', '<w:spacing w:before="200" w:after="80"/>', '<w:b/><w:i w:val="0"/><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>')
    for sid in ('Caption', 'TableCaption', 'ImageCaption'):
        patch(sid, '<w:jc w:val="center"/>', '<w:b/><w:i w:val="0"/><w:sz w:val="21"/>')
    patch('Figure', '<w:jc w:val="center"/>')
    patch('CaptionedFigure', '<w:jc w:val="center"/>')

    # Tabel bergaris dengan baris judul berlatar
    border = '<w:%s w:val="single" w:sz="4" w:space="0" w:color="808080"/>'
    borders = '<w:tblBorders>' + ''.join(border % b for b in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')) + '</w:tblBorders>'
    m = re.search(r'(<w:style [^>]*w:styleId="Table"[^>]*>.*?<w:tblPr>)(.*?)(</w:tblPr>)', s, flags=re.S)
    tblpr = re.sub(r'(<w:tblInd [^>]*/>)', r'\1' + borders, m.group(2), count=1)
    s = s[:m.start()] + m.group(1) + tblpr + m.group(3) + s[m.end():]
    s = re.sub(r'<w:tblStylePr w:type="firstRow">.*?</w:tblStylePr>',
               '<w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/><w:vAlign w:val="center"/></w:tcPr></w:tblStylePr>',
               s, count=1, flags=re.S)

    extra = ''
    for name, (ppr, rpr) in STYLE_OVERRIDES.items():
        sid = name.replace(' ', '')
        extra += (f'<w:style w:type="paragraph" w:customStyle="1" w:styleId="{sid}"><w:name w:val="{name}"/>'
                  f'<w:basedOn w:val="BodyText"/><w:qFormat/><w:pPr>{ppr}</w:pPr>' + (f'<w:rPr>{rpr}</w:rPr>' if rpr else '') + '</w:style>')
    return s.replace('</w:styles>', extra + '</w:styles>')


def patch_page(s):
    sect = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>')
    s = re.sub(r'<w:sectPr.*?</w:sectPr>', sect, s, flags=re.S)
    return s


def fix_tables(xml):
    """Tabel huruf 5x5 dibuat kecil di tengah; tabel lain selebar halaman."""
    def one(m):
        tbl = m.group(0)
        cells = re.findall(r'<w:tc>.*?</w:tc>', tbl, flags=re.S)
        texts = [''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', c)).strip() for c in cells]
        is_square = len(cells) == 25 and all(re.fullmatch(r'[A-Z]', t) for t in texts)
        if is_square:
            tbl = re.sub(r'<w:tblW [^>]*/>', '<w:tblW w:type="dxa" w:w="2600" /><w:jc w:val="center" />', tbl, count=1)
            tbl = re.sub(r'<w:gridCol w:w="\d+"\s*/>', '<w:gridCol w:w="520" />', tbl)

            def center(pm):
                ppr = set_block(pm.group(0), 'pPr', '<w:jc w:val="center"/>', PPR_ORDER)
                return ppr or pm.group(0).replace('<w:p>', '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>', 1)
            tbl = re.sub(r'<w:p>.*?</w:p>', center, tbl, flags=re.S)
        else:
            tbl = re.sub(r'<w:tblW [^>]*/>', '<w:tblW w:type="pct" w:w="5000" />', tbl, count=1)
        return tbl
    return re.sub(r'<w:tbl>.*?</w:tbl>', one, xml, flags=re.S)


def main():
    with open(HTML, encoding='utf8') as f:
        html = preprocess(f.read())
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'laporan.html')
        ref = os.path.join(tmp, 'reference.docx')
        raw = os.path.join(tmp, 'raw.docx')
        with open(src, 'w', encoding='utf8') as f:
            f.write(html)
        build_reference(ref)
        subprocess.run([
            'pandoc', src, '-f', 'html', '-t', 'docx', '--reference-doc', ref, '--lua-filter', FILTER,
            '--resource-path', REPORT_DIR, '--dpi', '150', '-o', raw,
        ], check=True)
        with zipfile.ZipFile(raw) as zin, zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == 'word/document.xml':
                    data = fix_tables(data.decode('utf8')).encode('utf8')
                elif item.filename == '[Content_Types].xml':
                    types = data.decode('utf8')
                    if 'Extension="png"' not in types:
                        types = types.replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
                                              '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/>', 1)
                    data = types.encode('utf8')
                zout.writestr(item, data)
    print('✓ Selesai:', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
