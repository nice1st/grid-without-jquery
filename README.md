### No jQuery, Non page Grid 컴포넌트

* jQuery 없이 vanilla javascript 
  * 이유: 추후 개선 될 시스템의 프레임웍이 정해지지 않음
* page 처리 없이 약 100건씩 조회
  * 스크롤 이벤트로 추가 조회
* 클래스
  * Grid
  * GridColumn
  * GridSearch 는 꼭 같이 쓰지 않아도 됨
* 초기화
  * 예제
  <pre>
      var option = {
        url: '../mok/data.{s}.json'
        , checkbox: {
          enable: true
        }
        , multipleSort: false
        , searchOption: {
          pageSize: 0
        }
        , showIndex: true
        , table: {
          scrollXEnable: false
          , dragColumn: {
            enable: true
          }
        }
        , columnOptions: [
          FirstGrid.makeColumnOption("time", "time", 180, true, Renderers.timeItemRender)
          , FirstGrid.makeColumnOption("name", "name", 50, false)
          , FirstGrid.makeColumnOption("port_name", "port", 50, true)
          , FirstGrid.makeColumnOption("protocol", "protocol", 60, true)
          , FirstGrid.makeColumnOption("src_mac", "sourceMac", 120, true)
          , FirstGrid.makeColumnOption("dst_mac", "destinationMac", 120, true)
          , FirstGrid.makeColumnOption("src_ip", "sourceIp", 110, true)
          , FirstGrid.makeColumnOption("dst_ip", "destinationIp", 110, true)
          , FirstGrid.makeColumnOption("count", "count", 50, true)
          , FirstGrid.makeColumnOption("action", "action", 50, true)
          , FirstGrid.makeColumnOption("state", "status", 50, true)
          , FirstGrid.makeColumnOption("timatrix_event_id", "timatrixEventId", 50, true)
        ]
      };
      var grid = new FirstGrid.Grid(document.getElementById("list_area"), option);
      grid.init();

      var sortOptions = [{"field": "time", "sort": FirstGrid.SORT.DESC}];
      grid.setSort(sortOptions);
  </pre>
* 이벤트
  * gridColumn-checkedChanged: 체크박스 변경
  * grid-selectedChanged: 레코드 선택 변경
  * grid-columnChanged: 칼럼 순서 변경 또는 칼럼 가시 변경
  * grid-sortChange: 정렬 변경
  * grid-tdClick: 항목 클릭
  * grid-trClick: 레코트 클릭
  * grid-getDataAfter: 데이터 조회, 후처리 하여 addRow() 호출해줘야 함
