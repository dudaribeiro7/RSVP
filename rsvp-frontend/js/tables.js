// js/mesas-view.js

const API_URL = "https://rsvp-backend-production.up.railway.app"; // Ajuste para a URL do seu backend

// Elementos
const searchInput = document.getElementById('search-name');
const clearSearchBtn = document.getElementById('clear-search');
const searchStatus = document.getElementById('search-status');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const noTablesEl = document.getElementById('no-tables');
const tablesContainer = document.getElementById('tables-container');

let allTables = {};
let allPeople = [];

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadTablesData();
});

// Busca
searchInput?.addEventListener('input', handleSearch);
clearSearchBtn?.addEventListener('click', clearSearch);

async function loadTablesData() {
  try {
    loadingEl?.classList.remove('hidden');
    errorEl?.classList.add('hidden');
    noTablesEl?.classList.add('hidden');
    tablesContainer.innerHTML = '';

    // Carregar lista de pessoas (endpoint público)
    const peopleResponse = await fetch(`${API_URL}/tables/people/public`);
    if (!peopleResponse.ok) throw new Error('Erro ao carregar pessoas');
    allPeople = await peopleResponse.json();

    // Carregar arranjo de mesas (endpoint público)
    const tablesResponse = await fetch(`${API_URL}/tables/view`);
    if (!tablesResponse.ok) throw new Error('Erro ao carregar mesas');
    allTables = await tablesResponse.json();

    loadingEl?.classList.add('hidden');

    // Verificar se há mesas
    if (Object.keys(allTables).length === 0) {
      noTablesEl?.classList.remove('hidden');
      return;
    }

    renderTables();

  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    loadingEl?.classList.add('hidden');
    errorEl?.classList.remove('hidden');
  }
}

function renderTables(searchQuery = '') {
  if (!tablesContainer) return;

  const tableNumbers = Object.keys(allTables).sort((a, b) => Number(a) - Number(b));

  if (tableNumbers.length === 0) {
    noTablesEl?.classList.remove('hidden');
    return;
  }

  let foundTables = 0;
  let highlightedPerson = null;

  tablesContainer.innerHTML = tableNumbers
    .map((tableNum) => {
      const peopleIds = allTables[tableNum] || [];
      
      if (peopleIds.length === 0) return ''; // Não mostrar mesas vazias

      // Obter informações das pessoas
      const peopleInfo = peopleIds
        .map((personId, index) => {
          if (!personId) return null;
          
          const person = allPeople.find((p) => p.id === personId);
          if (!person) return null;

          // Verificar se a pessoa corresponde à busca
          const isMatch =
            searchQuery &&
            person.name.toLowerCase().includes(searchQuery.toLowerCase());

          if (isMatch) {
            highlightedPerson = person.name;
          }

          return {
            number: index + 1,
            name: person.name,
            isMatch,
          };
        })
        .filter(Boolean);

      // Se está buscando, só mostrar mesas que têm match
      const hasMatch = peopleInfo.some((p) => p.isMatch);
      if (searchQuery && !hasMatch) {
        return '';
      }

      foundTables++;

      return `
        <div class="table-view-card ${hasMatch ? 'highlighted' : ''}">
          <div class="table-view-header">
            <h3 class="table-view-title">Mesa ${tableNum}</h3>
            <span class="table-view-count">${peopleInfo.length} ${
        peopleInfo.length === 1 ? 'pessoa' : 'pessoas'
      }</span>
          </div>
          <div class="table-view-people">
            ${peopleInfo
              .map(
                (person) => `
              <div class="table-view-person ${person.isMatch ? 'highlighted' : ''}">
                <div class="person-number">${person.number}</div>
                <div class="person-name">${escapeHtml(person.name)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  // Atualizar mensagem de status
  updateSearchStatus(searchQuery, foundTables, highlightedPerson);
}

function handleSearch(e) {
  const query = e.target.value.trim();
  renderTables(query);
}

function clearSearch() {
  searchInput.value = '';
  renderTables('');
  searchInput.focus();
}

function updateSearchStatus(query, foundTables, highlightedPerson) {
  if (!searchStatus) return;

  if (!query) {
    searchStatus.textContent = 'Digite um nome para buscar sua mesa';
    searchStatus.classList.remove('highlight');
    return;
  }

  if (foundTables === 0) {
    searchStatus.textContent = `Nenhuma mesa encontrada para "${query}"`;
    searchStatus.classList.remove('highlight');
  } else if (foundTables === 1) {
    searchStatus.textContent = `✓ ${highlightedPerson} está na mesa destacada abaixo`;
    searchStatus.classList.add('highlight');
  } else {
    searchStatus.textContent = `${foundTables} mesas encontradas`;
    searchStatus.classList.add('highlight');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}