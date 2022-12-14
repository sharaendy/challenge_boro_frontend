import uniqueId from 'lodash/uniqueId.js';
import createNode from './modules/createNode.js';
import sortByField from './modules/sortByField';
import appendElement from './modules/appendElement.js';
import cardsInfoGenerator from './modules/cardsInfoGenerator.js';
import treeInfoGenerator from './modules/treeInfoGenerator.js';
import changeVisibility from './modules/changeVisibility.js';
import treeModernisation from './modules/treeModernisation.js';

async function app() {
  const state = {
    cards: [],
    categories: [],

    uiState: {
      thumbnails: [],
      currentView: 'cards',
      filter: {
        type: null,
        isVisible: true,
      },
    },

    view: {
      currentPage: 1,
      rowsOnPage: 100,
    },

    filter: null,
  };

  await fetch('http://contest.elecard.ru/frontend_data/catalog.json')
    .then((res) => res.json())
    .then((json) => {
      state.cards = json;
    })
    .catch((error) => {
      console.warn(error);
      alert('Error receiving data from the server');
    });

  // ! App initialization
  const cardList = document.querySelector('.cards-wrapper');
  const ulContainer = document.querySelector('.treeline');
  const switcherEl = document.querySelector('#switcher');
  const sortElems = document.querySelectorAll('input[data-type]');
  const paginationEl = document.querySelector('.pagination');
  const filterEl = document.querySelector('.filter');

  // ! Local Storage
  function uploadLocalStorage() {
    const lastUiProp = JSON.parse(localStorage.getItem('lastUi'));
    if (lastUiProp) {
      state.uiState.thumbnails = lastUiProp;
    }
  }

  function setUiState() {
    state.uiState.thumbnails = state.cards.map((item) => {
      const uiElemThumbnail = { ...item, id: uniqueId(), isVisible: true };
      return uiElemThumbnail;
    });

    const uniqueCategories = [];
    state.cards.forEach(({ category }) => {
      if (!uniqueCategories.includes(category)) {
        uniqueCategories.push(category);
      }
    });
    state.categories = uniqueCategories.sort();
  }

  function renderThumbnailsUi(cards, rowsOnPage, currentPage) {
    const currentPageMod = currentPage - 1;
    const startSegment = rowsOnPage * currentPageMod;
    const endSegment = startSegment + rowsOnPage;
    const paginatedData = cards.slice(startSegment, endSegment);

    filterEl.style = `visibility: ${state.uiState.filter.isVisible}`;
    paginatedData
      .filter(({ isVisible }) => isVisible)
      .map((card) => {
        const {
          image, category, id, filesize, timestamp,
        } = card;

        const listEl = createNode('li');
        const cardInfoEl = createNode('div');
        const buttonEl = createNode('button');
        const imageEl = createNode('img');
        const imagePath = `http://contest.elecard.ru/frontend_data/${image}`;

        listEl.classList.add('card');
        imageEl.classList.add('card-img');
        imageEl.src = imagePath;
        cardInfoEl.classList.add('card-container');
        buttonEl.classList.add('card-btn');
        cardInfoEl.append(cardsInfoGenerator(category, filesize, timestamp));
        buttonEl.textContent = 'X';
        buttonEl.setAttribute('id', id);
        listEl.addEventListener('click', (e) => {
          state.uiState.thumbnails = changeVisibility(e.target.id, state.uiState.thumbnails);
          cardList.innerHTML = null;
          renderThumbnailsUi(
            state.uiState.thumbnails.filter(({ isVisible }) => isVisible),
            state.view.rowsOnPage,
            state.view.currentPage,
          );
        });

        switch (category) {
          case 'animals':
            imageEl.alt = 'image with animals';
            break;
          case 'business':
            imageEl.alt = 'image with business attr-s';
            break;
          case 'vehicle':
            imageEl.alt = 'image with vehicle';
            break;
          case 'food':
            imageEl.alt = 'image with food';
            break;
          case 'health':
            imageEl.alt = 'image with health attr-s';
            break;
          case 'places':
            imageEl.alt = 'image with some place';
            break;
          case 'science':
            imageEl.alt = 'image with science attr-s';
            break;
          case 'winter':
            imageEl.alt = 'winter landscape';
            break;
          default:
            imageEl.alt = '';
            break;
        }

        appendElement(listEl, imageEl);
        appendElement(listEl, cardInfoEl);
        appendElement(listEl, buttonEl);
        appendElement(cardList, listEl);

        return null;
      });
    localStorage.setItem('lastUi', JSON.stringify(state.uiState.thumbnails));
  }

  function resetView() {
    localStorage.removeItem('lastUi');
    cardList.innerHTML = null;
    setUiState();
    renderThumbnailsUi(
      state.uiState.thumbnails,
      state.view.rowsOnPage,
      state.view.currentPage,
    );
    document.location.reload();
  }

  function setRefreshBtn() {
    const refreshBtnEl = document.querySelector('.refresh-btn');
    refreshBtnEl.addEventListener('click', resetView);
  }

  // ! Pagination buttons display
  function displayPaginationBtn(pageNumber) {
    const paginatorPage = document.createElement('li');
    paginatorPage.classList.add('pagination__item');
    paginatorPage.textContent = pageNumber;

    if (pageNumber === state.view.currentPage) {
      paginatorPage.classList.add('pagination__item--active');
    }

    paginatorPage.addEventListener('click', () => {
      state.view.currentPage = pageNumber;
      cardList.innerHTML = null;
      renderThumbnailsUi(
        // state.uiState.thumbnails,
        state.uiState.thumbnails.filter(({ isVisible }) => isVisible),
        state.view.rowsOnPage,
        state.view.currentPage,
      );
      const currentActivePage = document.querySelector(
        'li.pagination__item--active',
      );
      currentActivePage.classList.remove('pagination__item--active');
      paginatorPage.classList.add('pagination__item--active');
    });

    return paginatorPage;
  }

  // ! Paginator generation
  function displayPagination() {
    paginationEl.innerHTML = null;
    const cards = state.uiState.thumbnails.filter(({ isVisible }) => isVisible);
    const rows = state.view.rowsOnPage;

    const pagesCount = Math.ceil(cards.length / rows);
    const paginatorList = document.createElement('ul');
    paginatorList.classList.add('pagination__list');

    for (let i = 0; i < pagesCount; i += 1) {
      const pageEl = displayPaginationBtn(i + 1);
      paginatorList.append(pageEl);
    }
    paginationEl.append(paginatorList);
  }

  // ! Tree render
  function renderTree() {
    function elementGenerator(categoryName) {
      const ulEl = document.createElement('ul');
      ulEl.classList.add('tree__coll');
      const images = state.uiState.thumbnails;

      images
        .filter(({ isVisible }) => isVisible)
        .filter(({ category }) => category === categoryName)
        .forEach(({ image, filesize, timestamp }) => {
          const cardLi = document.createElement('li');
          const cardPicEl = document.createElement('div');
          const cardTitleEl = document.createElement('div');

          cardLi.classList.add('card__item');
          cardPicEl.classList.add('card__pic');
          cardTitleEl.classList.add('card__data');

          cardTitleEl.append(treeInfoGenerator(filesize, timestamp));
          cardPicEl.style.backgroundImage = `url(http://contest.elecard.ru/frontend_data/${image})`;
          cardPicEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('maximized')) {
              e.target.classList.add('maximized');
            } else if (e.target.classList.contains('maximized')) {
              e.target.classList.remove('maximized');
            }
          });
          cardLi.prepend(cardPicEl);
          cardLi.append(cardTitleEl);
          ulEl.prepend(cardLi);
        });
      return ulEl;
    }

    function treeGenerator(categories) {
      const rootTitleEl = document.createElement('li');
      rootTitleEl.textContent = 'Categories';
      rootTitleEl.classList.add('tree__title');
      rootTitleEl.classList.add('handleLi');
      const rootListEl = document.createElement('ul');
      rootListEl.classList.add('tree__list');

      ulContainer.prepend(rootTitleEl);
      rootTitleEl.append(rootListEl);

      categories.forEach((cat) => {
        const liContainer = document.createElement('li');
        liContainer.classList.add('handleLi');
        liContainer.textContent = cat;
        liContainer.append(elementGenerator(cat));
        rootListEl.append(liContainer);
      });
    }

    filterEl.style = `visibility: ${state.uiState.filter.isVisible}`;
    treeGenerator(state.categories);
    treeModernisation();
  }

  // ! filtering modul logic
  function cardsFiltration() {
    sortElems.forEach((elem) => elem.addEventListener('change', (event) => {
      const sortType = event.target.value;
      state.uiState.filter.type = sortType;
      state.uiState.thumbnails = state.uiState.thumbnails
        .filter(({ isVisible }) => isVisible)
        .sort(sortByField(state.uiState.filter.type));
      cardList.innerHTML = null;
      renderThumbnailsUi(
        state.uiState.thumbnails,
        state.view.rowsOnPage,
        state.view.currentPage,
      );
    }));
  }

  // ! Render main view
  function render(view) {
    if (view === 'cards') {
      state.uiState.filter.isVisible = 'visible';
      cardList.innerHTML = null;
      ulContainer.innerHTML = null;
      uploadLocalStorage();
      renderThumbnailsUi(
        state.uiState.thumbnails,
        state.view.rowsOnPage,
        state.view.currentPage,
      );
      setRefreshBtn();
      cardsFiltration();
      displayPagination();
    } else if (view === 'tree') {
      state.uiState.filter.isVisible = 'hidden';
      cardList.innerHTML = null;
      ulContainer.innerHTML = null;
      uploadLocalStorage();
      renderTree();
    }
  }

  // ! Change main view (window)
  function changeView() {
    switcherEl.addEventListener('change', (e) => {
      const currentView = e.target.value;
      const buttons = document.querySelectorAll('.switcher__item');
      buttons.forEach((elem) => {
        elem.classList.remove('active');
      });
      e.target.parentNode.parentNode.classList.add('active');
      state.uiState.currentView = currentView;
      paginationEl.innerHTML = null;
      render(state.uiState.currentView);
    });
  }

  setUiState();
  changeView();
  render(state.uiState.currentView);
}

app();
