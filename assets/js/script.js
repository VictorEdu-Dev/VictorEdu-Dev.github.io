function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if(sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    } else {
        sidebar.classList.add('open');
    }
}

window.addEventListener('click', function(event) {
    var sidebar = this.document.getElementById('sidebar');
    var button = this.document.getElementById('open-sidebar');

    if(event.target !== sidebar && event.target !== button && !sidebar.contains(event.target)) {
        sidebar.classList.remove('open');
    }
})