const fs = require('fs');

// Función para normalizar palabras
function normalizeWord(word) {
  return word
    .normalize('NFD')              // Descomponer acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, ' ')          // Reducir múltiples espacios a uno
    .trim()                         // Eliminar espacios al inicio y al final
    .toLowerCase();                 // Convertir a minúsculas
}

// Cargar JSON original
let rawData = fs.readFileSync('dictionary.json', 'utf8');
let words = JSON.parse(rawData);

let seen = new Set();
let uniqueWords = [];

// Recorrer todas las palabras
words.forEach(word => {
  let normalized = normalizeWord(word);
  if (!seen.has(normalized)) {
    seen.add(normalized);
    uniqueWords.push(word); // Mantener la palabra original en el JSON
  }
});

// Guardar JSON limpio
fs.writeFileSync('dictionary_clean.json', JSON.stringify(uniqueWords, null, 2));

console.log(`Duplicados eliminados. Total palabras únicas: ${uniqueWords.length}`);
console.log('Archivo guardado como dictionary_clean.json');
