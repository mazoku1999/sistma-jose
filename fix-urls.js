const fs = require('fs');
const path = require('path');

// Dominio base
const BASE_DOMAIN = 'https://academico.sie.gob.bo';

// Archivos HTML a procesar
const HTML_FILES = [
    'sie-1-3.html',
    'sie-4-6.html',
    'ejemplo.html'
];

/**
 * Corrige las URLs en el contenido HTML
 * @param {string} content - Contenido HTML
 * @returns {string} - Contenido HTML con URLs corregidas
 */
function fixUrls(content) {
    // Patrones a reemplazar
    const patterns = [
        // Links CSS y otros recursos en href
        {
            regex: /href=["'](?!http|https|#|mailto|tel|javascript)(\/[^"']+)["']/gi,
            replacement: `href="${BASE_DOMAIN}$1"`
        },
        // Scripts src
        {
            regex: /src=["'](?!http|https|\/\/|data:)(\/[^"']+)["']/gi,
            replacement: `src="${BASE_DOMAIN}$1"`
        },
        // Background images en style
        {
            regex: /url\(["']?(\/[^)"']+)["']?\)/gi,
            replacement: `url("${BASE_DOMAIN}$1")`
        },
        // Action en forms
        {
            regex: /action=["'](?!http|https)(\/[^"']+)["']/gi,
            replacement: `action="${BASE_DOMAIN}$1"`
        },
        // Data attributes con URLs
        {
            regex: /data-[a-z-]+=["'](?!http|https)(\/[^"']+)["']/gi,
            replacement: (match) => {
                return match.replace(/=["'](\/[^"']+)["']/, `="${BASE_DOMAIN}$1"`);
            }
        }
    ];

    let fixedContent = content;

    patterns.forEach(pattern => {
        fixedContent = fixedContent.replace(pattern.regex, pattern.replacement);
    });

    return fixedContent;
}

/**
 * Procesa un archivo HTML
 * @param {string} filename - Nombre del archivo
 */
function processFile(filename) {
    const filePath = path.join(__dirname, filename);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Archivo no encontrado: ${filename}`);
        return;
    }

    try {
        // Leer el contenido del archivo
        console.log(`📖 Leyendo: ${filename}`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Corregir las URLs
        console.log(`🔧 Corrigiendo URLs en: ${filename}`);
        const fixedContent = fixUrls(content);

        // Crear backup
        const backupPath = filePath + '.backup';
        fs.writeFileSync(backupPath, content, 'utf8');
        console.log(`💾 Backup creado: ${filename}.backup`);

        // Guardar el archivo corregido
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`✅ Archivo corregido: ${filename}\n`);

        // Mostrar estadísticas
        const originalMatches = (content.match(/href=["']\/[^"']+["']/g) || []).length +
            (content.match(/src=["']\/[^"']+["']/g) || []).length;
        const fixedMatches = (fixedContent.match(new RegExp(BASE_DOMAIN, 'g')) || []).length;

        console.log(`📊 URLs corregidas: ~${fixedMatches} referencias`);
        console.log('─'.repeat(50) + '\n');

    } catch (error) {
        console.error(`❌ Error procesando ${filename}:`, error.message);
    }
}

/**
 * Función principal
 */
function main() {
    console.log('🚀 Iniciando corrección de URLs...\n');
    console.log(`🌐 Dominio base: ${BASE_DOMAIN}\n`);
    console.log('─'.repeat(50) + '\n');

    // Procesar cada archivo
    HTML_FILES.forEach(processFile);

    console.log('✨ Proceso completado!\n');
    console.log('📝 Notas:');
    console.log('   - Se creó un backup (.backup) de cada archivo');
    console.log('   - Las URLs externas (http/https) no fueron modificadas');
    console.log('   - Las URLs con # (anclas) no fueron modificadas');
}

// Ejecutar
main();
