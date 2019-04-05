if (typeof FirstGrid === "undefined") {
  var FirstGrid = {};
} else {
  console.error("namespace duplication!!! - FirstGrid");
}

FirstGrid.SORT = {ASC: 1, DESC: 2};

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

FirstGrid.makeColumnOption = function(field, displayName, width, renderer) {
  let defaultRenderer = function(v) {
    return v;
  }
  let result = {};
  result.field = field;
  result.displayName = displayName;
  result.width = width;
  result.renderer = renderer;
  // result.renderer = renderer == undefined ? defaultRenderer : renderer;
  return result;
}

FirstGrid.Grid = function($list_area, option) {
  
  isRending = null;
  scrollEventId = null;
  gridDatas = [];
  this.option = {
    "fetchOptions": {
      "method": "POST"
    }
    , "gridColumns": []
    , "table": {
      "className": ""
    }
    , "searchOption": {
      "pageSize": 100
      , "currentPage": 0
      , "order": []
      , "search": new FormData()
    }
    , "totalCount": 0
  };
  this.$list_area = $list_area;
  Object.assign(this.option, option);
  
  this.init = function() {
    const _this = this;
    
    this.$list_area.innerHTML = null;
    this.option.listeners = {};

    let $docfrag = document.createDocumentFragment();
    let $table = document.createElement("table");
    $table.className = this.option.table.className;
    let $tbody = document.createElement("tbody");
    $tbody.addEventListener("click", function(e) {
      onTbodyClick.call(_this, e);
    });

    addColgroupAndThead($table, this.option);
    $table.appendChild($tbody);
    $docfrag.appendChild($table);
    this.$list_area.appendChild($docfrag);
    
    setScrollEvent.call(this);
  }
  
  function addColgroupAndThead($table, option) {
    let $colgroup = document.createElement("colgroup");
    let $thead = document.createElement("thead");
    let $tr = document.createElement("tr");
    $thead.appendChild($tr);
    for (let index = 0; index < option.columnOptions.length; index++) {
      const columnOption = option.columnOptions[index];
      const gridColumn = new FirstGrid.FirstGridColumn(columnOption);
      gridColumn.init();
      
      const $th = gridColumn.getThead();
      $th.addEventListener("gridColumn-sort", function() {
        onColumnSortEvent(gridColumn, option);
      });
      option.gridColumns.push(gridColumn);

      $colgroup.appendChild(gridColumn.getColumn());
      $tr.appendChild($th);
    }
    
    $table.appendChild($colgroup);
    $table.appendChild($thead);
  }

  function onColumnSortEvent(gridColumn, option) {
    const $th = gridColumn.getThead();
    const sort = $th.dataset.sort;
    const currentOrder = option.searchOption.order;
    const fieldName = gridColumn.option.field;
    switch (Number(sort)) {
      case 0:
        currentOrder.splice($th.dataset.order, 1);
        break;
      case 1:
        currentOrder.push({"field": fieldName, "sort": sort});
        break;
      default:
        break;
    }
    option.searchOption.order = currentOrder;
  }

  function setScrollEvent() {
    
    var _this = this;
    this.$list_area.addEventListener("scroll", function(e) {
      let $ths = _this.$list_area.getElementsByTagName("thead")[0].getElementsByTagName("th");
      for (let index = 0; index < $ths.length; index++) {
        const $th = $ths[index];
        $th.style.top = _this.$list_area.scrollTop + "px";
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
    
    function querySearchParent(ele, selector) {
      let $docfrag = document.createDocumentFragment();
      let cur = e.target.parentNode;
      let result;
      while (cur != document) {
        $docfrag.appendChild(cur.cloneNode());
        if ($docfrag.querySelector(selector) != null) {
          return cur;
        }
        cur = cur.parentNode;
      }
      return null;
    }
    
    this.emit("grid-tdClick", e.target);
    const $tr = querySearchParent(e.target, "tr");
    this.emit("grid-trClick", $tr, gridDatas[$tr.dataset.index]);
  }
  
  this.getSearchOption = function() {
    return this.option.searchOption;
  }
  
  this.getSearchForm = function() {
    return this.option.searchOption.search;
  }

  this.setSearchForm = function(searchForm) {
    this.option.searchOption.search = searchForm;
  }

  this.search = function() {
    if (isRending != null) {
      return;
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
  
  // To-do
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
    
    // fetch(this.option.url, this.option.fetchOptions)
    const fetchUrl = this.option.url.replace("{s}", this.option.searchOption.pageSize);
    fetch(fetchUrl)
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      //////// Custom Function /////////
      _this.option.totalCount = json.total_elements;
      _this.addRows(json.content);
      //////////////////////////////////
      _this.emit("grid-getDataAfter");
    });
  }

  this.addRows = function(datas) {
    if (isRending != null) {
      return;
    }
    
    const $tbody= this.$list_area.getElementsByTagName("tbody")[0];
    let gridColumns = this.option.gridColumns;
    let cache = document.createDocumentFragment();
    let counter = 0;
    const everyNth = 10;
    const gridDatasLength = gridDatas.length;
    
    isRending = setInterval(function () {
      
      if (counter == datas.length) {
        clearInterval(isRending);
        $tbody.appendChild(cache);
        isRending = null;
        gridDatas = gridDatas.concat(datas);
        return;
      }
      
      if (counter % everyNth === 0) {
        $tbody.appendChild(cache);
        cache = document.createDocumentFragment();
      }
      
      const rowData = datas[counter];
      const $tr = document.createElement("tr");
      // $tr.append("<td>" + (counter + calcIdx) +"</td>")
      for (let index = 0; index < gridColumns.length; index++) {
        const gridColumn = gridColumns[index];
        const $td = document.createElement("td");
        if (gridColumn.option.renderer != undefined && typeof gridColumn.option.renderer === 'function') {
          const content = gridColumn.option.renderer(rowData[gridColumn.option.field], rowData);
          $td.innerHTML = content;
        } else {
          $td.innerHTML = rowData[gridColumn.option.field];
        }
        $tr.dataset.index = gridDatasLength + counter;
        $tr.appendChild($td);
      }
      cache.appendChild($tr);
      
      counter++;
    }, 0);
  }

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

  // sortOption = {field = "", sort = 1/2};
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
      newOrder.push(sortOption);
    }
    this.option.searchOption.order = newOrder;
  }

  // event emitter.. To-do 상속해야 됨??
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
        listener(...arg);
      }
    }
  }
}

FirstGrid.FirstGridColumn = function(option) {
  
  this.option = {};
  Object.assign(this.option, option);

  this.init = function() {
    createColumn(this.option);
    createThead(this.option);
  }

  createColumn = function(option) {
    const $col = document.createElement("col");
    $col.style.width = option.width + "px";
    option.$col = $col;
  }
  
  createThead = function(option) {
    const $th = document.createElement("th");
    const $span = document.createElement("span");
    $th.innerText = option.displayName;
    $span.className = "icon data_sort";
    $th.appendChild($span);
    $th.dataset.sort = 0;
    $th.addEventListener("click", function() {
      onClickTh.call(this);
    });
    option.$th = $th;
  }
  
  function onClickTh() {
    var currentSort = Number(this.dataset.sort);
    var newSort = (currentSort + 1) % 3;
    this.dataset.sort = newSort;
    this.dispatchEvent(new Event("gridColumn-sort"));
  }
  
  this.getColumn = function() {
    return this.option.$col;
  }

  this.getThead = function() {
    return this.option.$th;
  }
}
