import { CV_MAX_BYTES, conTipoCv, dimensioneLeggibile, erroreFileCv } from './cv-file';
import { linkedinValido } from './linkedin';

describe('file del CV', () => {
  it('accetta PDF, DOC e DOCX in qualunque combinazione di maiuscole', () => {
    for (const nome of ['cv.pdf', 'CV Mario.PDF', 'cv.doc', 'cv.docx', 'cv.finale.Docx']) {
      expect(erroreFileCv({ name: nome, size: 1000 })).toBeNull();
    }
  });

  it('rifiuta gli altri formati, anche senza estensione', () => {
    for (const nome of ['cv.txt', 'cv.exe', 'cv.pdf.exe', 'cv', 'cv.']) {
      expect(erroreFileCv({ name: nome, size: 1000 })).toMatch(/PDF, DOC o DOCX/);
    }
  });

  it('rifiuta i file vuoti e quelli oltre 5 MB, ma accetta esattamente 5 MB', () => {
    expect(erroreFileCv({ name: 'cv.pdf', size: 0 })).toMatch(/vuoto/);
    expect(erroreFileCv({ name: 'cv.pdf', size: CV_MAX_BYTES })).toBeNull();
    expect(erroreFileCv({ name: 'cv.pdf', size: CV_MAX_BYTES + 1 })).toMatch(/il massimo è 5 MB/);
    expect(erroreFileCv({ name: 'cv.pdf', size: 6 * 1024 * 1024 })).toBe('Il file pesa 6 MB: il massimo è 5 MB.');
  });

  it('scrive le dimensioni in modo leggibile', () => {
    expect(dimensioneLeggibile(812)).toBe('812 byte');
    expect(dimensioneLeggibile(245_760)).toBe('240 KB');
    expect(dimensioneLeggibile(1_258_291)).toBe('1,2 MB');
  });

  it('ricava il tipo dall’estensione quando il sistema non lo indica', () => {
    const f = conTipoCv(new File(['x'], 'cv.docx', { type: '' }));
    expect(f.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(f.name).toBe('cv.docx');
    const gia = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
    expect(conTipoCv(gia)).toBe(gia);
  });
});

describe('link LinkedIn', () => {
  it('accetta vuoto e gli indirizzi di linkedin.com e dei suoi sottodomini', () => {
    for (const v of ['', '   ', 'https://linkedin.com/in/mario', 'http://www.linkedin.com/in/mario', 'https://it.linkedin.com/in/mario', 'https://WWW.LinkedIn.com/in/mario/?l=it', 'https://www.linkedin.com']) {
      expect(linkedinValido(v)).toBe(true);
    }
  });

  it('rifiuta gli altri indirizzi', () => {
    for (const v of ['linkedin.com/in/mario', 'www.linkedin.com/in/x', 'ftp://linkedin.com/in/x', 'https://example.com/in/x', 'https://linkedin.com.evil.com/in/x', 'https://evillinkedin.com/in/x', 'https://linkedin.com@evil.com/', 'javascript:alert(1)', 'https://www.linkedin.com/in/a b']) {
      expect(linkedinValido(v)).toBe(false);
    }
  });
});
