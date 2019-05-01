if (typeof GridSearch === "undefined") {
  var GridSearch = {};
} else {
  console.error("namespace duplication!!! - GridSearch");
}

/**
 * GridSearch 클래스
 * @param {Element} $search_area 서치옵션이 들어갈 영역 div
 * @param {Object} option 옵션
 */
GridSearch.GridSearch = function($search_area, option) {
  
  this.option = {};
  this.$search_area = $search_area;
  Object.assign(this.option, option);

  this.init = function() {
    this.$search_area.innerHTML = null;
    this.option.listeners = {};

    let $docfrag = document.createDocumentFragment();
    
    const $inputGlobalSearch = document.createElement("input"); // 전체 조건 input
    $inputGlobalSearch.type = "text";
    $inputGlobalSearch.placeholder = "Search...";
    $docfrag.appendChild($inputGlobalSearch);
    
    const $a = document.createElement("a");
    $a.href = "#";

    //여기있으면 안되는 코드/////////////////////////////////////////////
    $a.addEventListener("mousedown", function() {
      if ($("~.layer_st", this).css("display") === "block") {
        $("~.layer_st", this).slideUp("fast");
      } else {
        $(".layer_st").slideUp("fast");
        $("~.layer_st", this).slideDown("fast");
      }
    });
    //////////////////////////////////////////////////////////////
    $docfrag.appendChild($a);
    
    const $divLayerArea = document.createElement("div"); // layer 로 숨겨질 div
    $divLayerArea.className = "layer_st";
    const $dynaminSearchForm = document.createElement("form");
    $divLayerArea.appendChild($dynaminSearchForm);
    $docfrag.appendChild($divLayerArea);
    
    this.$search_area.appendChild($docfrag);
    
    this.addSearchFormChildren($dynaminSearchForm); // 칼럼별 조건 input 생성
    addEventListeners.call(this);
  }
  
  /**
   * @param {form} $dynaminSearchForm 조건 input 이 추가 될 form
   */
  this.addSearchFormChildren = function($dynaminSearchForm) {
    
    let $docfrag = document.createDocumentFragment();
    const columnOptions = this.option.columnOptions;
    for (let index = 0; index < columnOptions.length; index++) { // 칼럼 옵션 리스트를 불러옴
      const columnOption = columnOptions[index];
      $docfrag.appendChild(makeSearchCondition(columnOption));
    }

    $dynaminSearchForm.appendChild($docfrag);
  }

  // 칼럼옵션의 filed와 displayName으로 input 생성
  function makeSearchCondition(columnOption) {

    const $dl = document.createElement("dl");
    const $dt = document.createElement("dt");
    const $dd = document.createElement("dd");
    const $input = document.createElement("input");

    $dl.style.padding = "5px";
    
    const $textNode = document.createTextNode("");
    // $textNode.appendData("&bull; ");
    $textNode.appendData(columnOption.displayName);
    $dt.appendChild($textNode);
    $dl.appendChild($dt);

    $input.type = "text";
    $input.name = columnOption.field;
    $dd.appendChild($input);
    $dl.appendChild($dd);

    return $dl;
  }

  function addEventListeners() {
    const _this = this;
    
    // enter key 처리
    function pressEnter(e) {
      if (e.keyCode === 13) {
        _this.emit("gridSearch-submit"); // 이벤트 발생. 외부에서 이벤트를 받아 Grid에 search() 명령을 수행하도록 함
      } else {
        _this.emit("gridSearch-change"); // 편집 이벤트 발생 - 검색버튼 하이라이트. Ctlr, Shift, Alt 등의 키도 포함됨
      }
    }
    
    // 전체/칼럼별 input 수정 시 상대 input 초기화를 위한 이벤트
    const $allInput = _this.$search_area.querySelector(":scope input");
    const $form = _this.$search_area.querySelector(":scope form");
    const $inputs = $form.querySelectorAll("input");
    
    $allInput.addEventListener("keypress", function(e) {
      for (let index = 0; index < $inputs.length; index++) {
        const $input = $inputs[index];
        $input.value = "";
      }
      pressEnter(e);
    });
    
    for (let index = 0; index < $inputs.length; index++) {
      const $input = $inputs[index];
      $input.addEventListener("keypress", function(e) {
        $allInput.value = "";
        pressEnter(e);
      });
    }
  }

  /**
   * 외부에서 검색조건 input을 채워넣음
   * @param {FormData} formData formData 의 key 와 input 의 name(columnOption.field) 을 맞춰야 됨
   */
  this.setSearchFormData = function(formData) {
    const $form = this.$search_area.querySelector(":scope form");
    const $inputs = $form.querySelectorAll("input");
    
    for (let index = 0; index < $inputs.length; index++) {
      const $input = $inputs[index];
      $input.value = formData.get($input.name);
    }
  }
  
  /**
   * @returns {FormData} 현재 input 들에 입력 된 내용을 돌려줌
   */
  this.getSearchFormData = function() {
    const $form = this.$search_area.querySelector(":scope form");
    const formData = new FormData($form); // 칼럼 검색조건 form 에 입력 된 데이터를 가져옴
    const $allInput = this.$search_area.querySelector(":scope input");
    const isSearchAll = $allInput.value != "";
    if (isSearchAll) { // 전체 검색인 경우
      const keys = formData.keys();
      let key = keys.next();
      while (!key.done) {
        formData.set(key.value, $allInput.value);
        key = keys.next();
      }
    } else { // 추가 작업이 필요한가???
      // const $formInputs = this.$search_area.querySelectorAll("form input");
      // for (let index = 0; index < $formInputs.length; index++) {
      //   const $input = $formInputs[index];
      //   console.log($input);
      // }
    }
    
    formData.set("search_all", isSearchAll);
    return formData;
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
      listeners.splice(index, 1);
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