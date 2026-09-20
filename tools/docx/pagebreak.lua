-- Ubah <div class="pagebreak"></div> menjadi pemisah halaman Word.
function Div(el)
  if el.classes:includes('pagebreak') then
    return pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
  end
end
