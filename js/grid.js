if (typeof FirstGrid === "undefined") {
  var FirstGrid = {};
} else {
  console.error("namespace duplication!!! - FirstGrid");
}

/** static 변수 */

// sort constatnt
FirstGrid.SORT = {ASC: 1, DESC: 2};

/** static 함수 */

/**
 * Object 가 필수 property 를 가지고 있는가 체크
 */
FirstGrid.checkObjectValues = function(object, options) {
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (typeof option === "string") {
      if (!object.hasOwnProperty(option)) {
        return option + " is required!";
      }
    } else {
      const key = Object.keys(option)[0];
      const value = option[key];
      if (value.indexOf(object[key]) < 0) {
        return key + " value is " + value + "only.";
      }
    }
  }

  return true;
}

/**
 * 칼럼 옵션 Object 생성
 */
FirstGrid.makeColumnOption = function(field, displayName, width, isShow, renderer) {
  let defaultRenderer = function(v) {
    return v;
  }
  let result = {};
  result.field = field;
  result.displayName = displayName;
  result.width = width;
  result.isShow = isShow;
  result.renderer = renderer;
  // result.renderer = renderer == undefined ? defaultRenderer : renderer;
  return result;
}

/**
 * 상위 노드를 찾아주는 메소드(jQuery의 closest 유사)
 * @param {HTMLElement} ele 기준이 될 객체
 * @param {String} selector 찾을 selector
 */
FirstGrid.querySearchParent = function(ele, selector) {
  let $docfrag = document.createDocumentFragment();
  let cur = ele;
  while (cur != document) {
    $docfrag.appendChild(cur.cloneNode());
    if ($docfrag.querySelector(selector) != null) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return null;
}

/**
 * Grid 클래스
 * @param {Element} $list_area 테이블이 들어갈 영역 div
 * @param {Object} option 옵션
 */
 FirstGrid.Grid = function($list_area, option) {
  
  let isRending = null; // 랜딩 중 다른 요청이 들어오는 것을 방지
  let scrollEventId = null; // 스크롤 이벤트가 중복으로 이뤄지는 것을 방지
  let gridDatas = [];
  // default 옵션
  this.option = {
    "fetchOptions": { // 현재 getDatas 함수가 POST 만 가능
      "method": "POST"
    }
    , "columnOptions": [] // 외부에서 입력받을 칼럼의 속성
    , "gridColumns": [] // 생성 된 칼럼들
    , "checkbox": { // 체크박스 사용 유무
      "enable": false
      , "filter": "To-Do"
    }
    , "showIndex": false // 인덱스 no 사용 유무
    , "multipleSort": false // 다중 정렬 사용 유무
    , "table": { // <table> 관련 속성
      "className": ""
      , "width": "100%"
      , "scrollXEnable": false
      , "dragColumn": { // 칼럼 이동
        "enable": false
        , "movingColumn": null
      }
    }
    , "searchOption": { // 검색조건 관련
      "pageSize": 100
      , "currentPage": 0
      , "order": []
      , "search": new FormData()
    }
    , "totalCount": 0
  };

  this.$list_area = $list_area; // div 영역
  Object.assign(this.option, option); // 인자 option 과 병합
  
  this.init = function() {
    const _this = this;
    
    this.$list_area.innerHTML = null;
    this.option.listeners = {};

    let $docfrag = document.createDocumentFragment(); // vDOM 생성
    let $table = document.createElement("table");
    $table.className = "fGrid " + this.option.table.className;
    $table.style.width = this.option.table.width;
    let $tbody = document.createElement("tbody");
    $tbody.addEventListener("click", function(e) {  // row 클릭 이벤트를 tbody 로 받는다
      onTbodyClick.call(_this, e);
    });

    createColgroupAndThead.call(this, $table); // GridColumn 생성
    $table.appendChild($tbody);
    $docfrag.appendChild($table);
    this.$list_area.appendChild($docfrag);
    
    setScrollEvent.call(this);
  }

  /**
   * init 에서 받은 옵션의 columnOptions 기준으로 GridColumn 을 생성하여 table 에 append 함
   * @param {Element} $table 테이블
   * @param {Object} option 옵션
   */
  function createColgroupAndThead($table) {
    const option = this.option;
    let $colgroup = document.createElement("colgroup");
    let $thead = document.createElement("thead");
    let $tr = document.createElement("tr");
    $thead.appendChild($tr);

    if (option.checkbox.enable == true) { // 체크 박스 칼럼
      const checkbocColumn = createCheckboxColumn($table, this);
      option.gridColumns.push(checkbocColumn);
      addColgroupAndThead.call(this, $colgroup, $tr, checkbocColumn);
    }
    
    if (option.showIndex == true) { // Number 칼럼
      const noColumn = createNumberColumn();
      option.gridColumns.push(noColumn);
      addColgroupAndThead.call(this, $colgroup, $tr, noColumn);
    }

    for (let index = 0; index < option.columnOptions.length; index++) {
      const columnOption = option.columnOptions[index];
      columnOption.minWidthEnable = option.table.scrollXEnable;
      columnOption.draggable = option.table.dragColumn.enable;
      const gridColumn = new FirstGrid.FirstGridColumn(columnOption); // 칼럼 클래스 생성
      gridColumn.init();
      option.gridColumns.push(gridColumn);
      addColgroupAndThead.call(this, $colgroup, $tr, gridColumn);
      addGridColumnEventListener.call(this, gridColumn);
    }
    
    $table.appendChild($colgroup);
    $table.appendChild($thead);
  }
  
  function createCheckboxColumn($table, _this) {
    const $totalInput = document.createElement("input"); // 체크박스 생성
    $totalInput.type = "checkbox";

    const columnOption = FirstGrid.makeColumnOption("grid-checkbox", $totalInput, 30, true, Renderers.checkbox); // checkbox 렌더러에서 이벤트 받아야 됨
    const gridColumn = new FirstGrid.FirstGridColumn(columnOption); // gridColmn 객체 생성
    gridColumn.option.ignoreEvent = true;
    gridColumn.init();

    $totalInput.addEventListener("change", function(e) {
      gridColumn.emit("gridColumn-checkedChanged", e);
    });

    gridColumn.addListener("gridColumn-checkedChanged", function(e) { // girdColumn 객체로 전체/행 checkbox 의 이벤트를 수신 함
      const $target = e.target;
      const $tbody = $table.querySelector("tbody");
      const $checkboxes = $tbody.querySelectorAll("input[type='checkbox']");
      if ($checkboxes.length > 0) {
        // const $lastCheckbox = $tbody.querySelector("input[type='checkbox'].lastCheck"); // 마지막으로 클릭 된 체크박스가 무엇인지 ui 로 표현하기 위한 class (필요하다면)
        // if ($lastCheckbox) {
        //   $lastCheckbox.classList.remove("lastCheck");
        // }
        if ($target == $totalInput) { // 전체
          for (let index = 0; index < $checkboxes.length; index++) {
            const $checkbox = $checkboxes[index];
            $checkbox.checked = $target.checked;
          }
        } else { // 행
          if (_this.isShiftKey) { // press shift
            const start = Math.min(gridColumn.getColumn().dataset.lastCheckIndex, $target.dataset.index);
            const end = Math.max(gridColumn.getColumn().dataset.lastCheckIndex, $target.dataset.index) + 1;
            for (let index = start; index < end; index++) {
              const $tmpCheckbox = $checkboxes[index];
              $tmpCheckbox.checked = $target.checked; // 마지막 클릭된 노드부터 checked 갱신
            }
          }

          const $checkedboxes = $tbody.querySelectorAll("input[type='checkbox']:checked");
          $totalInput.checked = $checkboxes.length == $checkedboxes.length;
          // $target.classList.add("lastCheck"); // 마지막으로 클릭 된 체크박스가 무엇인지 ui 로 표현하기 위한 class (필요하다면)
          gridColumn.getColumn().dataset.lastCheckIndex = $target.dataset.index;
        }
      }

      _this.emit("grid-selectedChanged");
    });
    
    return gridColumn; // girdColumn 객체 리턴
  }

  function createNumberColumn() {
    const noColumn = new FirstGrid.FirstGridColumn(FirstGrid.makeColumnOption("grid-no", "No", 30, true, Renderers.number));
    noColumn.option.ignoreEvent = true;
    noColumn.init();
    return noColumn;
  }
  
  function addColgroupAndThead($colgroup, $tr, gridColumn) {
    $colgroup.appendChild(gridColumn.getColumn());
    $tr.appendChild(gridColumn.getThead());
  }
  
  function addGridColumnEventListener(gridColumn) {
    const _this = this;
    gridColumn.addListener("gridColumn-sort", function() { // 칼럼 타이틀 클릭시 GridColumn에서 발생되는 이벤트
      onColumnSortEvent.call(_this, gridColumn);
    });
    
    gridColumn.addListener("gridColumn-moveStart", function() { // 칼럼 드래그 시작
      _this.option.table.dragColumn.movingColumn = this;
    });

    gridColumn.addListener("gridColumn-move", function() { // 드래그 타겟이 다른 칼럼 위로 올라갔을 때
      const movingColumn = _this.option.table.dragColumn.movingColumn;
      if (movingColumn != null && movingColumn != this) {
        const $movingThead = movingColumn.getThead();
        const $tr = $movingThead.parentNode;
        const targetIndex = Array.prototype.slice.call($tr.children).indexOf(this.getThead());
        $tr.insertBefore($tr.removeChild($movingThead), $tr.children[targetIndex]); // 위치 변경(Title 만)
      }
    });

    gridColumn.addListener("gridColumn-moveEnd", function() { // 드래그 종료
      const movingColumn = _this.option.table.dragColumn.movingColumn;
      const $movingThead = movingColumn.getThead();
      const $tr = $movingThead.parentNode;
      
      const gridColumns = _this.option.gridColumns;
      const fromIndex = gridColumns.indexOf(movingColumn);
      const toIndex = Array.prototype.slice.call($tr.children).indexOf($movingThead);
      
      if (fromIndex == toIndex) {
        return;
      }

      gridColumns.splice(toIndex, 0, gridColumns.splice(fromIndex, 1)[0]);
      const $colgroup = _this.$list_area.querySelector("colgroup");
      $colgroup.insertBefore($colgroup.removeChild($colgroup.children[fromIndex]), $colgroup.children[toIndex]);
      const $trs = _this.$list_area.querySelector("tbody").querySelectorAll("tr");
      for (let i = 0; i < $trs.length; i++) {
        const $tr = $trs[i];
        $tr.insertBefore($tr.removeChild($tr.children[fromIndex]), $tr.children[toIndex]); // 컨텐츠 위치 변경
      }

      _this.emit("grid-columnChanged"); // 외부로 이벤트 발생
    });
  }

  function onColumnSortEvent(gridColumn) {
    const option = this.option;
    const $th = gridColumn.getThead();
    const sort = $th.dataset.sort; // sort 속성은 GridColumn 에서 추가 됨
    let orders = option.searchOption.order;
    const fieldName = gridColumn.option.field;
    switch (Number(sort)) {
      case 0:
        if (option.multipleSort == true) {
          orders.splice($th.dataset.order, 1);
          for (let index = $th.dataset.order; index < orders.length; index++) {
            const order = orders[index];
            const gridColumn = this.getGridColumnByField(order.field);
            gridColumn.getThead().dataset.order = index;
          }
          delete $th.dataset.order;
        } else {
          orders = [];
        }
        break;
      case 1:
        if (option.multipleSort == true) {
          $th.dataset.order = orders.length; // order 속성은 Grid 에서 컨트롤 함
        } else {
          for (let index = 0; index < orders.length; index++) {
            const order = orders[index];
            const gridColumn = this.getGridColumnByField(order.field);
            if ($th != gridColumn.getThead()) {
              gridColumn.getThead().dataset.sort = 0;
            }
          }
          orders = [];
        }
        orders.push({"field": fieldName, "sort": sort});
        break;
      case 2:
        if (option.multipleSort == true) {
          orders[$th.dataset.order].sort = sort;
        } else {
          orders[0].sort = sort;
        }
        break;
      default:
        break;
    }
    option.searchOption.order = orders;
    this.emit("grid-sortChange");
  }

  function setScrollEvent() {
    const _this = this;
    this.$list_area.addEventListener("scroll", function(e) {
      let $ths = _this.$list_area.getElementsByTagName("thead")[0].getElementsByTagName("th");
      for (let index = 0; index < $ths.length; index++) {
        const $th = $ths[index];
        $th.style.top = _this.$list_area.scrollTop + "px"; // 칼럼 타이틀 영역 상단고정
      }
      if (isRending != null) {
        return;
      }
      if (_this.option.totalCount < ((_this.option.searchOption.currentPage + 1) * _this.option.searchOption.pageSize)) { // 총량보다 페이지가 초과하면 조회하지 않음
        return;
      }
      clearTimeout(scrollEventId); // 요청이 오면 타임아웃 초기화
      scrollEventId = setTimeout(function() { onScrollEvent.call(_this) }, 500); // 다시 0.5 타임아웃 후 onScrollEvent() 펑션 실행
    });
  }
  
  function onScrollEvent() {
    const scrollTop = this.$list_area.scrollTop;
    const docHeight = this.$list_area.scrollHeight;
    const winHeight = this.$list_area.clientHeight;
    const scrollPercent = (scrollTop) / (docHeight - winHeight);
    const scrollPercentRounded = Math.round(scrollPercent*100);
    
    if (scrollPercentRounded > 80) { // 스크롤의 위치가 80% 넘으면
      this.option.searchOption.currentPage++;
      this.getDatas();
    }
  }
  
  function onTbodyClick(e) {
    this.isShiftKey = e.shiftKey; // 클릭 이벤트의 shift 를 저장함, checkbox.change 이벤트보다 먼저 수행 됨
    const $td = FirstGrid.querySearchParent(e.target, "td");
    if ($td.dataset.ignoreEvent == true) {
      return;
    }
    this.emit("grid-tdClick", $td);
    const $tr = FirstGrid.querySearchParent(e.target, "tr");
    this.emit("grid-trClick", $tr, gridDatas[$tr.dataset.index]); // 클릭 된 row 의 element 와 data 를 리턴
  }
  
  /**
   * @returns {FormData} sort 와 order 정보가 담긴 formData 
   */
  this.getSortOptions = function() {
    if (this.option.searchOption.order.length == 0) {
      return null; // 오더 정보가 없다면 null 을 리턴
    }

    const result = new FormData();
    result.set("sortOptions", JSON.stringify(this.option.searchOption.order));
    return result;
  }
  
  /**
   * @returns 현재 조회되고 있는 실제 검색옵션
   * 여기서 페이지옵션만 추가되어 조회됨
   */
  this.getSearchForm = function() {
    return this.option.searchOption.search;
  }

  /**
   * @param {FormData} searchForm 외부에서 검색 조건을 조합하여 주입
   */
  this.setSearchForm = function(searchForm) {
    this.option.searchOption.search = searchForm;
  }

  this.search = function() {
    if (isRending != null) {
      clearInterval(isRending);
      isRending = null;
    }
    
    if (this.option.url == undefined || this.option.url == "") {
      console.warn("FirstGrid.Grid.option.url is null");
      return;
    }

    const $tbody= this.$list_area.getElementsByTagName("tbody")[0];
    $tbody.innerHTML = null;
    gridDatas = [];

    this.option.searchOption.currentPage = 0;
    this.getDatas();
  }
  
  this.getDatas = function() {
    if (isRending != null) {
      return;
    }
    const _this = this;
    
    const formData = this.getSearchForm();
    formData.set("page", this.option.searchOption.currentPage);
    formData.set("pageSize", this.option.searchOption.pageSize);
    
    const param = new URLSearchParams(formData);
    this.option.fetchOptions.body = param;
    
    // fetch(this.option.url, this.option.fetchOptions) // POST 메소드: formdata 를 전달하여 조회
    const fetchUrl = this.option.url.replace("{s}", this.option.searchOption.pageSize);
    fetch(fetchUrl)
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      //////// Custom Function /////////
      // _this.option.totalCount = json.total_elements;
      // _this.addRows(json.content);
      //////////////////////////////////
      _this.emit("grid-getDataAfter", json); // addrow 를 호출하기 위한 데이터를 외부에서 만들어야 함
    });
  }

  this.addRows = function(datas) {
    if (isRending != null) {
      return;
    }
    
    const _this = this;
    const $tbody= this.$list_area.getElementsByTagName("tbody")[0];
    let gridColumns = this.option.gridColumns;
    let cache = document.createDocumentFragment(); // vDom
    let counter = 0;
    const everyNth = 10; // 10줄씩 렌딩
    const gridDatasLength = gridDatas.length;
    
    isRending = setInterval(function () { // 무한루프
      
      if (counter == datas.length) { // 모든 row를 다 돌았다면
        clearInterval(isRending);
        $tbody.appendChild(cache);
        isRending = null;
        gridDatas = gridDatas.concat(datas);
        return;
      }
      
      if (counter % everyNth === 0) { // 지정 된 갯수만큼 모이면 렌딩 후 vDom 초기화
        $tbody.appendChild(cache);
        cache = document.createDocumentFragment();
      }
      
      const rowData = datas[counter];
      let gridIndex = gridDatasLength + counter;
      const $tr = document.createElement("tr");
      // datas(조회 된 데이터) 에서 counter(인덱스) 의 rowData 를 꺼내어 columnOption 에 맞춰 tr 생성
      for (let index = 0; index < gridColumns.length; index++) {
        const gridColumn = gridColumns[index];
        const $td = document.createElement("td");
        $td.dataset.ignoreEvent = gridColumn.option.ignoreEvent;

        let content = "";
        if (rowData.hasOwnProperty(gridColumn.option.field)) { // 기본 값
          content = rowData[gridColumn.option.field];
        }
        if (gridColumn.option.renderer != undefined && typeof gridColumn.option.renderer === 'function') { // 렌더러가 있으면
          content = gridColumn.option.renderer(content, rowData, gridColumn, gridIndex); // renderer
        }
        if (content instanceof HTMLElement) { // 테그 일 경우
          $td.appendChild(content);
        } else { // 아닐 경우 (이거 한번에 해주는 펑션없나..)
          $td.innerHTML = content;
        }
        $td.addEventListener("mouseenter", function(e) {
          if (this.offsetWidth < this.scrollWidth) {
            this.title = content;
          }
        });

        if (!gridColumn.option.isShow) {
          $td.style.display = "none";
        }
        $tr.appendChild($td);
      }
      $tr.dataset.index = gridIndex;
      cache.appendChild($tr); // vDom 에 append tr
      
      counter++;
    }, 0);
  }

  /**
   * @param {String} fieldName 필드 이름
   * @returns {FirstGridColumn} 그리드칼럼 객체
   */
  this.getGridColumnByField = function(fieldName) {
    const gridColumns = this.option.gridColumns;
    for (let index = 0; index < gridColumns.length; index++) {
      const gridColumn = gridColumns[index];
      if (gridColumn.option.field == fieldName) {
        return gridColumn;
      }
    }
    return null;
  }

  /**
   * 초기화 할때(또는 그 외) 수동으로 적용 될 sort 설정
   * @param {Object} sortOption {field = "", sort = 1/2}
   */
  this.setSort = function(sortOptions) {
    this.option.searchOption.order = [];
    let newOrder = [];
    for (let index = 0; index < sortOptions.length; index++) {
      const sortOption = sortOptions[index];
      const gridColumn = this.getGridColumnByField(sortOption.field);
      const validSortOption = FirstGrid.checkObjectValues(sortOption, ["field", "sort"]);

      if (validSortOption !== true) {
        console.warn(validSortOption);
        continue;
      }
      if (gridColumn == null) {
        console.warn("field name fault! == " + sortOption.field);
        continue;
      }
      
      gridColumn.getThead().dataset.sort = sortOption.sort;
      if (this.option.multipleSort == true) {
        gridColumn.getThead().dataset.order = newOrder.length;
      }
      newOrder.push(sortOption);
    }
    this.option.searchOption.order = newOrder;
  }

  /**
   * 체크되어있는 row 의 데이터를 리턴
   * @returns {Array}
   */
  this.getCheckedRowData = function() {
    const result = [];
    const $tbody = this.$list_area.querySelector("tbody");
    const $checkedboxes = $tbody.querySelectorAll("input[type='checkbox']:checked");
    for (let index = 0; index < $checkedboxes.length; index++) {
      const $checkedbox = $checkedboxes[index];
      const $tr = FirstGrid.querySearchParent($checkedbox, "tr");
      result.push(gridDatas[$tr.dataset.index]);
    }
    return result;
  }

  /**
   * @param {Number} index 조작 할 칼럼의 index (checkbox 와 number 포함)
   * @param {Boolean} isShow display on/off
   * @returns "grid-columnChanged event"
   */
  this.setDisplayColumnByIndex = function(index, isShow) {
    this.option.gridColumns[index].isShow(isShow);
    
    const $trs = this.$list_area.querySelector("tbody").getElementsByTagName("tr");
    for (let i = 0; i < $trs.length; i++) {
      const $tr = $trs[i];
      $tr.getElementsByTagName("td")[index].style.display = isShow ? "table-cell" : "none"; // 컨텐츠 display 처리
    }
    
    this.emit("grid-columnChanged"); // 외부로 이벤트 발생
  }
  
  /**
   * @param {String} fieldName 조작 할 칼럼의 field name
   * @param {Boolean} isShow display on/off
   * @returns "grid-columnChanged event"
   */
  this.setDisplayColumnByFieldName = function(fieldName, isShow) {
    for (let i = 0; i < this.option.gridColumns.length; i++) {
      const gridColumn = this.option.gridColumns[i];
      if (fieldName == gridColumn.option.field) {
        this.setDisplayColumnByIndex(i, isShow);
        break;
      }
    }
  }

  /////////////////////////////////////////
  // event emitter.. To-do 상속해야 됨??
  /////////////////////////////////////////
  this.addListener = function(label, callback) {
    if (!this.option.listeners.hasOwnProperty(label)) {
      this.option.listeners[label] = [];
    }
    this.option.listeners[label].push(callback);
  }

  this.removeListener = function(label, callback) {
    const listeners = this.option.listeners[label];
    let i = -1;
    for (let index = 0; index < listeners.length; index++) {
      const listener = listeners[index];
      if (typeof listener == "function" && listener === callback) {
        i = index;
        break;
      }
    }
    
    if (i > -1) {
      listeners.splice(i, 1);
      this.option.listeners[label] = listeners;
      return true;
    } else {
      return false;
    }
  }
  
  this.emit = function(label, ...arg) {
    const listeners = this.option.listeners[label];
    
    if (listeners && listeners.length > 0) {
      for (let index = 0; index < listeners.length; index++) {
        const listener = listeners[index];
        listener.call(this, ...arg);
      }
    }
  }
}

/**
 * GridColumn 클래스
 */
FirstGrid.FirstGridColumn = function(option) {
  
  this.option = {
    "ignoreEvent": false
    , "isShow": true
    , "draggable": false
  };
  Object.assign(this.option, option);

  this.init = function() {
    this.option.listeners = {};
    createColumn.call(this);
    createThead.call(this);
    this.isShow(this.option.isShow);
  }

  // 칼럼그룹 만들기
  function createColumn() {
    const option = this.option;
    const $col = document.createElement("col");
    $col.style.width = option.width + "px";

    option.$col = $col;
  }
  
  // 칼럼 헤드 만들기
  function createThead() {
    const _this = this;
    const option = this.option;
    const $th = document.createElement("th");
    $th.draggable = option.draggable;
    
    if (option.displayName instanceof HTMLElement) {
      $th.appendChild(option.displayName);
    } else {
      $th.innerText = option.displayName;
    }

    if (option.minWidthEnable) { // 횡스크롤 옵션
      $th.style.minWidth = option.width + "px";
    }
    
    if (option.ignoreEvent != true) { // 이벤트 무시 - 체크박스, 넘버
      const $span = document.createElement("span");
      $span.className = "icon data_sort";
      $th.appendChild($span);
      $th.dataset.sort = 0;
      $th.addEventListener("click", function() { // sort 를 위한 칼럼 헤드 클릭 이벤트
        const currentSort = Number(this.dataset.sort);
        const newSort = (currentSort + 1) % 3;
        this.dataset.sort = newSort;
        _this.emit("gridColumn-sort");
      });
  
      $th.addEventListener("dragstart", function() { // 칼럼 드래그 시작
        this.style.opacity = 0.4;
        _this.emit("gridColumn-moveStart"); // Grid 에서 처리
      });

      $th.addEventListener("dragend", function() { // 칼럼 드래그 종료
        this.style.opacity = 1;
        _this.emit("gridColumn-moveEnd"); // Grid 에서 처리
      });
      
      $th.addEventListener("dragenter", function(e) { // 다른 GridColumn 객체가 자신의 객체 위로 올라옴
        _this.emit("gridColumn-move"); // Grid 에서 처리
      });
    }
    
    option.$th = $th;
  }
  
  this.getColumn = function() {
    return this.option.$col;
  }

  this.getThead = function() {
    return this.option.$th;
  }

  this.isShow = function(isShow) {
    if (this.option.isShow == isShow) {
      return;
    }

    this.option.isShow = isShow;
    if (isShow) {
      this.getColumn().style.display = "table-column";
      this.getThead().style.display = "table-cell";
    } else {
      this.getColumn().style.display = "none";
      this.getThead().style.display = "none";
    }
  }
  
  /////////////////////////////////////////
  // event emitter.. To-do 상속해야 됨??
  /////////////////////////////////////////
  this.addListener = function(label, callback) {
    if (!this.option.listeners.hasOwnProperty(label)) {
      this.option.listeners[label] = [];
    }
    this.option.listeners[label].push(callback);
  }

  this.removeListener = function(label, callback) {
    const listeners = this.option.listeners[label];
    let i = -1;
    for (let index = 0; index < listeners.length; index++) {
      const listener = listeners[index];
      if (typeof listener == "function" && listener === callback) {
        i = index;
        break;
      }
    }
    
    if (i > -1) {
      listeners.splice(i, 1);
      this.option.listeners[label] = listeners;
      return true;
    } else {
      return false;
    }
  }
  
  this.emit = function(label, ...arg) {
    const listeners = this.option.listeners[label];
    
    if (listeners && listeners.length > 0) {
      for (let index = 0; index < listeners.length; index++) {
        const listener = listeners[index];
        listener.call(this, ...arg);
      }
    }
  }
}
