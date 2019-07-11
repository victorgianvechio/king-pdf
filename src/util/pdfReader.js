/*
    Processa o arquivo dividindo por página e extraíndo o
    Cod. Funcionario para renomear cada arquivos 
*/

const extract = require('pdf-text-extract')
const hummus = require('hummus')
const path = require('path')
const fs = require('fs')
const log = require('./logger.js')
const ipc = require('electron').ipcRenderer

let fieldName = ''
let qtdeChar = ''
let fileName = ''
let posName = 0
let pdfLog = ''

// Deleta os arquivos da pasta
const deleteFiles = async () => {
    await fs.readdirSync(outputFolder).filter(file => {
        fs.unlinkSync(path.join(outputFolder, file))
    })
}

// Remove todos os espaços e quebras de linhas do pdf
// Disponível em logs/pdf.log
const formatPDF = async page => {
    return new Promise((resolve, reject) => {
        let pdf = page
        let spaces =
            '                                                                                   '

        while (spaces.length > 1) {
            pdf = pdf.split(spaces).join(' ')
            spaces = spaces.slice(0, -1)
        }
        pdf = pdf.replace(/\r?\n|\r/g, '')
        resolve(pdf)
    })
}

const proccessPDF = (filePath, outputPath, layout) => {
    let sourcePDF = filePath
    let outputFolder = outputPath
    let mensagem = ''
    let pdfWriter = ''

    fieldName = process.env[`FIELD_NAME_${layout.toUpperCase()}`]
    qtdeChar = Number(process.env[`QTDE_CHAR_${layout.toUpperCase()}`])

    return new Promise((resolve, reject) => {
        extract(sourcePDF, async (err, pages) => {
            if (err) reject(err)

            log.create()

            if (pages && pages.length >= 2) {
                await ipc.send(
                    'show-progressbar',
                    'Dividindo e renomeando arquivos',
                    false,
                    pages.length
                )

                for (let i = 0; i < pages.length; i++) {
                    pdfLog = await formatPDF(pages[i])

                    posName = pdfLog.indexOf(fieldName) + (fieldName.length + 1)
                    fileName =
                        fieldName.trim() === ''
                            ? `${layout}_${i + 1}`
                            : pdfLog.substring(posName, posName + qtdeChar)

                    await log.debug(`page ${i + 1}  -\t ${fileName.trim()}.pdf`)

                    if (fileName.trim().length === qtdeChar) {
                        pdfWriter = hummus.createWriter(
                            path.join(outputFolder, `${fileName.trim()}.pdf`)
                        )
                        pdfWriter.appendPDFPagesFromPDF(sourcePDF, {
                            type: hummus.eRangeTypeSpecific,
                            specificRanges: [[i, i]]
                        })
                        pdfWriter.end()
                    } else {
                        if (fieldName.trim() === '') {
                            pdfWriter = hummus.createWriter(
                                path.join(outputFolder, `${fileName.trim()}.pdf`)
                            )
                            pdfWriter.appendPDFPagesFromPDF(sourcePDF, {
                                type: hummus.eRangeTypeSpecific,
                                specificRanges: [[i, i]]
                            })
                            pdfWriter.end()
                        } else {
                            mensagem = 'Inconsistência encontrada!'
                            log.debug('Texto extraído diferente do tamanho definido')
                            reject(mensagem)
                        }
                        // mensagem = 'Inconsistência encontrada!'
                        // log.debug('Texto extraído diferente do tamanho definido')
                        // reject(mensagem)
                    }
                    await ipc.send('progressbar-next')
                }
                resolve(mensagem)
            } else {
                mensagem = 'Arquivo inválido.'
                log.debug('Arqivo corrompido, inválido ou possuí apenas uma página.')
                reject(mensagem)
            }
            pdfLog = await formatPDF(pages[0])
            log.pdf(pdfLog)
        })
    })
}

module.exports = { proccessPDF: proccessPDF }
