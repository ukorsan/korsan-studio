'use strict';
/* Locale support: browser-only; the selected language is stored locally. */
(function(){
 const version=document.querySelector('.version');if(version)version.textContent='BETA 1.0';
 const langs=[
  ['en','English'],['pt-PT','Português'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano']
 ];
 // Each translation array: EN, PT-PT, ES, FR, DE, IT.
 const strings={
 '+ Track':['+ Track','+ Pista','+ Pista','+ Piste','+ Spur','+ Traccia'],
 'Video overlay · V2':['Video overlay · V2','Sobreposição vídeo · V2','Superposición vídeo · V2','Superposition vidéo · V2','Video-Overlay · V2','Sovrapposizione video · V2'],
 'Titles · T1':['Titles · T1','Títulos · T1','Títulos · T1','Titres · T1','Titel · T1','Titoli · T1'],
 'Audio · A1':['Audio · A1','Áudio · A1','Audio · A1','Audio · A1','Audio · A1','Audio · A1'],
 'Extra titles · T2':['Extra titles · T2','Títulos extra · T2','Títulos extra · T2','Titres extra · T2','Zusätzliche Titel · T2','Titoli extra · T2'],
 'Extra audio · A2':['Extra audio · A2','Áudio extra · A2','Audio extra · A2','Audio supplémentaire · A2','Zusätzliches Audio · A2','Audio extra · A2'],
 'Os teus ficheiros':['Your media','Os teus ficheiros','Tus archivos','Tes médias','Deine Medien','I tuoi file'],
 'Importa os teus vídeos, imagens e áudio.':['Videos, images and audio.','Vídeos, imagens e áudio.','Vídeos, imágenes y audio.','Vidéos, images et audio.','Videos, Bilder und Audio.','Video, immagini e audio.'],
 '＋ Importar multimédia':['+ Import media','+ Importar multimédia','+ Importar medios','+ Importer des médias','+ Medien importieren','+ Importa media'],
 'Arrasta ficheiros para aqui':['Drop files here','Arrasta ficheiros aqui','Arrastra archivos aquí','Dépose des fichiers ici','Dateien hier ablegen','Trascina qui i file'],
 'BIBLIOTECA':['LIBRARY','BIBLIOTECA','BIBLIOTECA','BIBLIOTHÈQUE','BIBLIOTHEK','LIBRERIA'],
 'Ainda não importaste vídeos.':['No media yet','Ainda sem ficheiros','Sin archivos','Aucun média','Noch keine Medien','Nessun file'],
 'Multimédia':['Media','Multimédia','Medios','Médias','Medien','Media'],
 'GIPHY':['GIPHY','GIPHY','GIPHY','GIPHY','GIPHY','GIPHY'],
 'Vetores':['Graphics','Vetores','Gráficos','Graphismes','Grafiken','Grafica'],
 'Transições':['Transitions','Transições','Transiciones','Transitions','Übergänge','Transizioni'],
 'Texto':['Text','Texto','Texto','Texte','Text','Testo'],
 'Áudio':['Audio','Áudio','Audio','Audio','Audio','Audio'],
 'Ajuda':['Help','Ajuda','Ayuda','Aide','Hilfe','Aiuto'],
 'Projeto sem título':['Untitled project','Projeto sem título','Proyecto sin título','Projet sans titre','Unbenanntes Projekt','Progetto senza titolo'],
 '● Guardado localmente':['● Saved locally','● Guardado localmente','● Guardado localmente','● Enregistré en local','● Lokal gespeichert','● Salvato in locale'],
 '● A guardar...':['● Saving…','● A guardar…','● Guardando…','● Enregistrement…','● Wird gespeichert…','● Salvataggio…'],
 '● Pronto para criar':['● Ready','● Pronto','● Listo','● Prêt','● Bereit','● Pronto'],
 'Formato':['Format','Formato','Formato','Format','Format','Formato'],
 'Qualidade':['Quality','Qualidade','Calidad','Qualité','Qualität','Qualità'],
 'Codificação':['Encoder','Codificação','Codificador','Encodeur','Kodierung','Codifica'],
 'Exportar':['Export','Exportar','Exportar','Exporter','Exportieren','Esporta'],
 'Propriedades':['Properties','Propriedades','Propiedades','Propriétés','Eigenschaften','Proprietà'],
 'PRÉ-VISUALIZAÇÃO':['PREVIEW','PRÉ-VISUALIZAÇÃO','VISTA PREVIA','APERÇU','VORSCHAU','ANTEPRIMA'],
 'O teu próximo vídeo começa aqui':['Your video starts here','O teu vídeo começa aqui','Tu vídeo empieza aquí','Ta vidéo commence ici','Dein Video beginnt hier','Il tuo video inizia qui'],
 'Arrasta vídeos para a timeline para começar.':['Add media to the timeline','Adiciona clips à timeline','Añade clips a la línea de tiempo','Ajoute des clips au montage','Medien zur Zeitleiste hinzufügen','Aggiungi clip alla timeline'],
 'Seleciona um clip na timeline para editar as propriedades.':['Select a clip to edit','Seleciona um clip para editar','Selecciona un clip','Sélectionne un clip','Clip zum Bearbeiten wählen','Seleziona una clip'],
 'TIMELINE':['TIMELINE','TIMELINE','LÍNEA DE TIEMPO','TIMELINE','ZEITLEISTE','TIMELINE'],
 'TEMPO':['TIME','TEMPO','TIEMPO','TEMPS','ZEIT','TEMPO'],
 'Títulos 2':['Titles 2','Títulos 2','Títulos 2','Titres 2','Titel 2','Titoli 2'],
 'Títulos':['Titles','Títulos','Títulos','Titres','Titel','Titoli'],
 'Sobreposição':['Overlay','Sobreposição','Superposición','Superposition','Overlay','Sovrapposizione'],
 'Vídeo':['Video','Vídeo','Vídeo','Vidéo','Video','Video'],
 'Áudio 2':['Audio 2','Áudio 2','Audio 2','Audio 2','Audio 2','Audio 2'],
 'Dividir':['Split','Dividir','Dividir','Scinder','Teilen','Dividi'],
 '✂ Dividir':['✂ Split','✂ Dividir','✂ Dividir','✂ Scinder','✂ Teilen','✂ Dividi'],
 '↶ Desfazer':['↶ Undo','↶ Desfazer','↶ Deshacer','↶ Annuler','↶ Rückgängig','↶ Annulla'],
 '↷ Refazer':['↷ Redo','↷ Refazer','↷ Rehacer','↷ Rétablir','↷ Wiederholen','↷ Ripeti'],
 '⌫ Eliminar':['⌫ Delete','⌫ Eliminar','⌫ Eliminar','⌫ Supprimer','⌫ Löschen','⌫ Elimina'],
 '⇤ Ripple':['⇤ Ripple','⇤ Ripple','⇤ Ripple','⇤ Ripple','⇤ Ripple','⇤ Ripple'],
 'Sem ficheiro':['Missing media','Sem ficheiro','Archivo ausente','Média manquant','Medium fehlt','File mancante'],
 'Pista da timeline':['Track','Pista','Pista','Piste','Spur','Traccia'],
 'Esquerda':['Left','Esquerda','Izquierda','Gauche','Links','Sinistra'],
 'Topo':['Top','Topo','Arriba','Haut','Oben','Alto'],
 'Largura':['Width','Largura','Anchura','Largeur','Breite','Larghezza'],
 'Altura':['Height','Altura','Altura','Hauteur','Höhe','Altezza'],
 'Duplicar':['Duplicate','Duplicar','Duplicar','Dupliquer','Duplizieren','Duplica'],
 'Eliminar':['Delete','Eliminar','Eliminar','Supprimer','Löschen','Elimina'],
 'Posição':['Position','Posição','Posición','Position','Position','Posizione'],
 'Duração':['Duration','Duração','Duración','Durée','Dauer','Durata'],
 'Posição e tamanho da sobreposição (%)':['Overlay position & size (%)','Posição e tamanho da sobreposição (%)','Posición y tamaño (%)','Position et taille (%)','Position und Größe (%)','Posizione e dimensione (%)'],
 'Fade in (segundos)':['Fade in (s)','Fade in (s)','Entrada (s)','Fondu entrant (s)','Einblenden (s)','Dissolvenza in (s)'],
 'Fade out (segundos)':['Fade out (s)','Fade out (s)','Salida (s)','Fondu sortant (s)','Ausblenden (s)','Dissolvenza out (s)'],
 'Silenciar clip':['Mute clip','Silenciar clip','Silenciar clip','Couper le son','Clip stummschalten','Disattiva audio'],
 'Ativar som do clip':['Unmute clip','Ativar som','Activar sonido','Rétablir le son','Ton einschalten','Attiva audio'],
 '✦ Transições':['✦ Transitions','✦ Transições','✦ Transiciones','✦ Transitions','✦ Übergänge','✦ Transizioni'],
 'Escolher':['Choose','Escolher','Elegir','Choisir','Wählen','Scegli'],
 'Remover':['Remove','Remover','Quitar','Retirer','Entfernen','Rimuovi'],
 'Sem transição':['No transition','Sem transição','Sin transición','Aucune transition','Kein Übergang','Nessuna transizione'],
 'Suaves':['Smooth','Suaves','Suaves','Douces','Weich','Morbide'],
 'Movimento':['Motion','Movimento','Movimiento','Mouvement','Bewegung','Movimento'],
 'Criativas':['Creative','Criativas','Creativas','Créatives','Kreativ','Creative'],
 'Dissolver':['Dissolve','Dissolver','Disolver','Fondu','Überblenden','Dissolvi'],
 'Zoom In':['Zoom In','Zoom In','Zoom In','Zoom avant','Vergrößern','Zoom avanti'],
 'Wipe à esquerda':['Wipe left','Wipe à esquerda','Barrido izq.','Balayage gauche','Wischen links','Tendina sinistra'],
 'Wipe à direita':['Wipe right','Wipe à direita','Barrido der.','Balayage droite','Wischen rechts','Tendina destra'],
 'Wipe para cima':['Wipe up','Wipe para cima','Barrido arriba','Balayage haut','Wischen oben','Tendina su'],
 'Wipe para baixo':['Wipe down','Wipe para baixo','Barrido abajo','Balayage bas','Wischen unten','Tendina giù'],
 'Deslizar à esquerda':['Slide left','Deslizar à esquerda','Deslizar izq.','Glisser gauche','Nach links','Scorri a sinistra'],
 'Deslizar à direita':['Slide right','Deslizar à direita','Deslizar der.','Glisser droite','Nach rechts','Scorri a destra'],
 'Deslizar para cima':['Slide up','Deslizar para cima','Deslizar arriba','Glisser haut','Nach oben','Scorri su'],
 'Deslizar para baixo':['Slide down','Deslizar para baixo','Deslizar abajo','Glisser bas','Nach unten','Scorri giù'],
 'Círculo expandir':['Circle reveal','Círculo expandir','Círculo','Cercle','Kreis','Cerchio'],
 'Wipe diagonal':['Diagonal wipe','Wipe diagonal','Barrido diagonal','Balayage diagonal','Diagonalwischen','Tendina diagonale'],
 'Duração':['Duration','Duração','Duración','Durée','Dauer','Durata'],
 '✦ Aplicar':['✦ Apply','✦ Aplicar','✦ Aplicar','✦ Appliquer','✦ Anwenden','✦ Applica'],
 'Seleciona o segundo de dois clips na pista V1 para aplicar um efeito.':['Select the second video on V1.','Seleciona o segundo vídeo na V1.','Selecciona el segundo vídeo en V1.','Sélectionne la deuxième vidéo sur V1.','Wähle den zweiten Clip auf V1.','Seleziona il secondo video su V1.'],
 'Efeitos suaves e dinâmicos inspirados na edição do Clipchamp e Canva.':['Transitions between clips.','Transições entre clips.','Transiciones entre clips.','Transitions entre clips.','Übergänge zwischen Clips.','Transizioni tra clip.'],
 'Aplica entre clips V1 consecutivos. A exportação inclui a transição visual e fades de áudio.':['Works between adjacent V1 clips.','Para clips V1 consecutivos.','Entre clips V1 consecutivos.','Entre clips V1 adjacents.','Zwischen V1-Clips.','Tra clip V1 consecutivi.'],
 'GIFs e Stickers':['GIFs & Stickers','GIFs e Stickers','GIFs y stickers','GIFs et stickers','GIFs und Sticker','GIF e sticker'],
 'Biblioteca de Multimédia':['Graphics library','Biblioteca de Multimédia','Biblioteca gráfica','Bibliothèque graphique','Grafikbibliothek','Libreria grafica'],
 'Logos de marcas':['Brand logos','Logos de marcas','Logotipos','Logos de marques','Markenlogos','Loghi dei marchi'],
 'Ícones e vetores':['Icons','Ícones e vetores','Iconos','Icônes','Symbole','Icone'],
 'Formas e overlays':['Shapes & overlays','Formas e overlays','Formas y overlays','Formes','Formen & Overlays','Forme e overlay'],
 'Todas':['All','Todas','Todas','Toutes','Alle','Tutte'],
 'Todos':['All','Todos','Todos','Tous','Alle','Tutti'],
 'Cor':['Color','Cor','Color','Couleur','Farbe','Colore'],
 'Original':['Original','Original','Original','Original','Original','Original'],
 'Só favoritos':['Favorites only','Só favoritos','Solo favoritos','Favoris uniquement','Nur Favoriten','Solo preferiti'],
 'Atualizar':['Refresh','Atualizar','Actualizar','Actualiser','Aktualisieren','Aggiorna'],
 'Mostrar mais':['Show more','Mostrar mais','Mostrar más','Voir plus','Mehr anzeigen','Mostra altro'],
 'Importar':['Import','Importar','Importar','Importer','Importieren','Importa'],
 'Novo':['New','Novo','Nuevo','Nouveau','Neu','Nuovo'],
 'Pesquisar':['Search','Pesquisar','Buscar','Rechercher','Suchen','Cerca'],
 'Tendências':['Trending','Tendências','Tendencias','Tendances','Trends','Tendenze'],
 'Ligar GIPHY':['Connect GIPHY','Ligar GIPHY','Conectar GIPHY','Connecter GIPHY','GIPHY verbinden','Connetti GIPHY'],
 'Limpar':['Clear','Limpar','Limpiar','Effacer','Löschen','Cancella'],
 'Mostrar mais':['Load more','Mostrar mais','Mostrar más','Afficher plus','Mehr laden','Carica altro'],
 'Repor filtros':['Reset filters','Repor filtros','Restablecer filtros','Réinitialiser les filtres','Filter zurücksetzen','Ripristina filtri'],
 'Filtros de imagem':['Image filters','Filtros de imagem','Filtros de imagen','Filtres image','Bildfilter','Filtri immagine'],
 'Presets de animação':['Animation presets','Presets de animação','Animaciones','Animations','Animationsvorlagen','Preset animazioni'],
 'Keyframes':['Keyframes','Keyframes','Fotogramas clave','Images clés','Keyframes','Fotogrammi chiave'],
 '＋ Adicionar título':['+ Add title','+ Adicionar título','+ Añadir título','+ Ajouter un titre','+ Titel hinzufügen','+ Aggiungi titolo'],
 '＋ Importar áudio':['+ Import audio','+ Importar áudio','+ Importar audio','+ Importer audio','+ Audio importieren','+ Importa audio'],
 'Áudio e música':['Audio & music','Áudio e música','Audio y música','Audio et musique','Audio und Musik','Audio e musica'],
 'Cria títulos e legendas manuais.':['Titles and captions.','Títulos e legendas.','Títulos y subtítulos.','Titres et sous-titres.','Titel und Untertitel.','Titoli e sottotitoli.'],
 'Importa áudio ou extrai-o dos vídeos.':['Import audio.','Importa áudio.','Importa audio.','Importe de l’audio.','Audio importieren.','Importa audio.'],
 'O teu título':['Your title','O teu título','Tu título','Ton titre','Dein Titel','Il tuo titolo'],
 'TÍTULO PRINCIPAL':['MAIN TITLE','TÍTULO PRINCIPAL','TÍTULO PRINCIPAL','TITRE PRINCIPAL','HAUPTTITEL','TITOLO PRINCIPALE'],
 'Texto simples':['Simple text','Texto simples','Texto simple','Texte simple','Einfacher Text','Testo semplice'],
 'A exportar o teu vídeo':['Exporting','A exportar','Exportando','Exportation','Exportiere','Esportazione'],
 'O vídeo está pronto!':['Export complete','Vídeo pronto!','Vídeo listo','Vidéo prête','Video fertig','Video pronto'],
 'Transferir vídeo':['Download video','Transferir vídeo','Descargar vídeo','Télécharger la vidéo','Video herunterladen','Scarica il video'],
 'Fechar':['Close','Fechar','Cerrar','Fermer','Schließen','Chiudi']
 };
 const codes=langs.map(x=>x[0]);const base=new Map(),translations={};
 for(const [key,values] of Object.entries(strings)){
  base.set(key,key);
  if(!translations[key])translations[key]={};
  codes.forEach((code,i)=>translations[key][code]=values[i]||values[0]);
 }
 const normalized=x=>String(x).replace(/\s+/g,' ').trim();
 for(const [key,values] of Object.entries(strings)){
  for(const val of values)if(val)base.set(val,key);
 }
 const orig=new WeakMap(),last=new WeakMap();
 let locale=codes.includes(localStorage.getItem('korsan-language'))?localStorage.getItem('korsan-language'):'en';
 const exclusions='#media-list,#audio-list,#stock-grid,#giphy-results,.clip,.clip-label,.asset-name,.giphy-card,#title-preview,#v2-title-preview';
 function translateText(node){
  const parent=node.parentElement;
  if(!parent||parent.closest(exclusions)||['SCRIPT','STYLE'].includes(parent.tagName))return;
  const current=normalized(node.nodeValue);
  if(!current)return;
  const prior=orig.get(node),translated=last.get(node);
  if(!prior||current!==translated){orig.set(node,current)}
  const original=orig.get(node),key=base.get(original);
  if(!key)return;
  const result=translations[key]?.[locale]||translations[key]?.en||original;
  const raw=node.nodeValue,m=/^(\s*)(.*?)(\s*)$/s.exec(raw);
  const next=(m?.[1]||'')+result+(m?.[3]||'');
  if(raw!==next){last.set(node,normalized(next));node.nodeValue=next}
 }
 function traverse(root){
  if(root.nodeType===3){translateText(root);return}
  if(root.nodeType!==1)return;
  if(root.matches?.(exclusions)||root.closest?.(exclusions))return;
  if(['SCRIPT','STYLE'].includes(root.tagName))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(translateText);
 }
 const label=document.createElement('label');label.className='quality locale-picker';label.htmlFor='korsan-locale';
 const title=document.createElement('span');title.textContent='Language';title.id='language-label';
 const select=document.createElement('select');select.id='korsan-locale';select.setAttribute('aria-label','Language');
 for(const [code,name] of langs){const option=document.createElement('option');option.value=code;option.textContent=name;select.append(option)}
 select.value=locale;label.append(title,select);
 document.querySelector('.topbar .top-spacer').after(label);
 const headings={en:'Language','pt-PT':'Idioma',es:'Idioma',fr:'Langue',de:'Sprache',it:'Lingua'};
 const placeholders={
  '#stock-query':{en:'Search logos and icons…','pt-PT':'Pesquisar logos e ícones…',es:'Buscar logos e iconos…',fr:'Rechercher des icônes…',de:'Symbole suchen…',it:'Cerca loghi e icone…'},
  '#giphy-query':{en:'Search GIFs…','pt-PT':'Pesquisar GIFs…',es:'Buscar GIFs…',fr:'Rechercher des GIFs…',de:'GIFs suchen…',it:'Cerca GIF…'}
 };
 function update(){
  document.documentElement.lang=locale;
  title.textContent=headings[locale];select.value=locale;
  traverse(document.body);
  for(const [sel,values] of Object.entries(placeholders)){const input=document.querySelector(sel);if(input)input.placeholder=values[locale]}
 }
 let scheduled=false;
 const observer=new MutationObserver(mutations=>{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;
   for(const mutation of mutations){
    if(mutation.type==='characterData')translateText(mutation.target);
    else mutation.addedNodes.forEach(traverse);
   }
  })
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 select.onchange=()=>{locale=select.value;localStorage.setItem('korsan-language',locale);update()};
 update();
 window.KorsanI18n={set(code){if(codes.includes(code)){locale=code;localStorage.setItem('korsan-language',code);update()}},get(){return locale},codes};
})();
