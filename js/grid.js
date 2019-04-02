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
  
  isRending = false;
  scrollEventId = null;
  this.option = {
    "gridColumns": []
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
    this.$list_area.innerHTML = null;

    let $docfrag = document.createDocumentFragment();
    let $table = document.createElement("table");
    let $tbody = document.createElement("tbody");

    addColgroupAndThead($table, this.option);
    $table.appendChild($tbody);
    $docfrag.appendChild($table);
    this.$list_area.appendChild($docfrag);
    
    setScrollEvent(this);
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
    switch (sort) {
      case 0:
        currentOrder.splice($th.dataset.order, 1);
        for (let index = 0; index < currentOrder.length; index++) {
          if (currentOrder[index] == fieldName) {
            currentOrder.slice(index, 1);
            break;
          }
        }
        break;
      case 1:
        currentOrder.push(fieldName);
        break;
      default:
        break;
    }
    console.log(currentOrder);
    console.log(option.searchOption.order);
  }

  function setScrollEvent(_this) {
    
    _this.$list_area.addEventListener("scroll", function(e) {
      let $ths = _this.$list_area.getElementsByTagName("thead")[0].getElementsByTagName("th");
      for (let index = 0; index < $ths.length; index++) {
        const $th = $ths[index];
        $th.style.top = _this.$list_area.scrollTop + "px";
      }
      if (_this.option.totalCount < (_this.option.currentPage * _this.option.pageSize)) { // 총량보다 페이지가 초과하면 조회하지 않음
        return;
      }
      clearTimeout(scrollEventId); // 요청이 오면 타임아웃 초기화
      scrollEventId = setTimeout(onScrollEvent, 500, _this); // 다시 0.5 타임아웃 후 onScrollEvent() 펑션 실행
    });
  }
      
  function onScrollEvent(_this) {
      
    const scrollTop = _this.$list_area.scrollTop;
    const docHeight = _this.$list_area.scrollHeight;
    const winHeight = _this.$list_area.clientHeight;
    const scrollPercent = (scrollTop) / (docHeight - winHeight);
    const scrollPercentRounded = Math.round(scrollPercent*100);
    
    if (scrollPercentRounded > 80) { // 스크롤의 위치가 80% 넘으면
      _this.option.searchOption.currentPage++;
      _this.getDatas();
    }
  }
  
  this.getSearchForm = function() {
    return this.option.searchOption.search;
  }

  this.setSearchForm = function(searchForm) {
    this.option.searchOption.search = searchForm;
  }

  this.search = function() {
    if (this.option.url == undefined || this.option.url == "") {
      console.warn("FirstGrid.Grid.option.url is null");
      return;
    }

    const $tbody= this.$list_area.getElementsByTagName("tbody")[0];
    $tbody.innerHTML = null;

    this.getDatas();
  }
  
  // To-do
  this.getDatas = function() {
    let _this = this;

    const param = this.getSearchForm();
    console.log(param);
    fetch(this.option.url)
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      //////// test code /////////
      _this.option.totalCount = json.length;
      let startIndex = _this.option.searchOption.currentPage * _this.option.searchOption.pageSize;
      let datas = json.slice(startIndex, (startIndex + _this.option.searchOption.pageSize));
      _this.addRows(datas);
    });
  }

  this.addRows = function(datas) {
    const $tbody= this.$list_area.getElementsByTagName("tbody")[0];
    let gridColumns = [];
    for (let index = 0; index < this.option.gridColumns.length; index++) {
      const gridColumn = this.option.gridColumns[index];
      gridColumns.push(gridColumn);
    }

    let cache = document.createDocumentFragment();
    let counter = 0;
    const everyNth = 10;
    
    let rendingTimer = null;
    rendingTimer = setInterval(function () {
      
      if (counter == datas.length) {
        clearInterval(rendingTimer);
        $tbody.appendChild(cache);
        isRending = false;
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
    this.option.searchOption.order = {};
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
      newOrder.push(sortOption.field);
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
    let $col = document.createElement("col");
    $col.style.width = option.width + "px";
    option.$col = $col;
  }
  
  createThead = function(option) {
    let $th = document.createElement("th");
    $th.innerText = option.displayName;
    $th.dataset.sort = 0;
    $th.addEventListener("click", function() {
      onClickTh(this);
    });
    option.$th = $th;
  }
  
  function onClickTh($th) {
    var currentSort = Number($th.dataset.sort);
    var newSort = (currentSort + 1) % 3;
    $th.dataset.sort = newSort;
    $th.dispatchEvent(new Event("gridColumn-sort"));
  }
  
  this.getColumn = function() {
    return this.option.$col;
  }

  this.getThead = function() {
    return this.option.$th;
  }
}
