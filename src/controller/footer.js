module.exports = $ => {
    $('#footer').load('../../app/view/components/footer.html')

    $(document).ready(() => {
        $('#electron-version').text(process.versions.electron)
    })
}
