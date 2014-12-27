
"use strict";
/* jshint undef: true, unused: true */
/* global angular */

/**
* TIDE D3 - Blanket
* 
* Layout Service & Directive to present data as a combination of bars & curves (blankets)
* 
* Requires data with histogram format (amount for each x - value or range of values)
*
* All data nodes can be grouped in categories (Y categories)
* Initial representation is a bar with the average value, for each categorie
* Optional representations are parallel area curves for each category or an accumulated curve with all categries stacked
*
* @author Ernesto Laval - TIDE SA
*
*/

/**
 * @ngdoc overview
 * @name tide-angular-blanket
 * @description
 * Data visualization tools from TIDE SA
 *
 */
angular.module("tide-angular")
.directive("tdBlanket",["$compile","_", "d3", "toolTip", "$window", 'tdBlanketLayout',function ($compile,_, d3, tooltip, $window, tdBlanketLayout) {
 return {
  restrict: "A",
      scope: {
        data: "=tdData",
        tooltipMessage: "=?tdTooltipMessage",
        clickHandler : "=?tdClickHandler",
        categoryAttribute : "=?tdCategoryAttribute",
        xAttribute : "=?tdXAttribute",
        sizeAttribute : "=?tdSizeAttribute",
        sortCriteria : "=?tdSortCriteria",
        chartType : "=?tdChartType",
        xLabel : "=?tdXLabel",
        yLabel : "=?tdYLabel"
      },
      
      link: function (scope, element, attrs) {

        var margin = {};
        margin.left = scope.options && scope.options.margin && scope.options.margin.left ? scope.options.margin.left : 100;
        margin.right = 5;
        margin.top = 5;
        margin.bottom = 50;

        var width = element.width()-margin.left-margin.right;
        var height = scope.height ? scope.height : 300;

        var xLabel = scope.xLabel ? scope.xLabel : "x";
        var yLabel = scope.yLabel ? scope.yLabel : "y";
 
        var colorScale = d3.scale.category10();

        // Define dataPoints tooltip generator
        var dataPointTooltip = tooltip();
        if (scope.tooltipMessage) {
          dataPointTooltip.message(scope.tooltipMessage);
        } else {
          dataPointTooltip.message(function(d) {
            var msg = "Id" + " : " + d["id"];
            return  msg;
          });
        }

        var svgMainContainer = d3.select(element[0])
          .append("svg")
          .attr("width", width+margin.left+margin.right)
          .attr("height", height+margin.top+margin.bottom)

        var svgContainer = svgMainContainer
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
 
        // chartContainer usado para que las etiquetas no queden bajo el gráfico
        var chartContainer = svgContainer
          .append("g")


        var resizeSvg = function() {
          width = element.width()-margin.left-margin.right;
          svgMainContainer.attr("width",element.width())
        }

        svgContainer.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
          .append("text")
            .attr("class", "label")
            .attr("x", width)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text(xLabel);


        svgContainer.append("g")
            .attr("class", "y axis")
          .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(yLabel);

        // Variable utilizada para identificar si gráficos comienzan apilados
        var chartType = scope.chartType ? scope.chartType : "bars";  // "bars" | "parallelCurves" | "stackedCurves"

        var previouschartType = chartType;


        var render = function(data) {
          if (data) {

            previouschartType = chartType;

            chartType = scope.chartType ? scope.chartType : "bars"

            var layout = tdBlanketLayout
              .categoryAttribute(scope.categoryAttribute)
              .measurementAttribute(scope.xAttribute)
              .amountAttribute(scope.sizeAttribute)
              //.sortCriteria(scope.sortCriteria)

            var nodes = layout.nodes(data);

            // Determina el rango de valores para eje X
            var xDomain = d3.extent(data, function(d) {
              return +d[scope.xAttribute]
            })

            // Determina el mayor valor en el eje Y acumulando todos los datos (todas las categorias)
            var maxYAccumulated = layout.maxYAccumulated(data);

            // Determina el mayor valor tomando las categorías por separado
            var maxYNonAcumulated = layout.maxYNonAccumulated(data);


            // Scales
            var Yscale = d3.scale.linear().domain([0,maxYAccumulated]).range([height,0]);
            var Xscale = d3.scale.linear().domain(xDomain).range([0,width]);
            var YbandScale = d3.scale.ordinal().rangeBands([height,0], 0.2, 0.2)

            // Axis
            var xAxis = d3.svg.axis()
                          .scale(Xscale);

            var color = d3.scale.category10();

            YbandScale.domain(layout.categories(data));
            var Ysmallscale = d3.scale.linear().domain([0,maxYNonAcumulated]).range([0,YbandScale.rangeBand()]);

            // Generadores de PATH elements para distintos tipos de cgráficos
            // Curvas Parallelas
            var unstackedArea = d3.svg.area()
                  .x(function(d) {return Xscale(d.x);})
                  //.y0(function(d) {return self.Yscale(0+100);})
                  .y0(function(d) {return YbandScale(d.category)+YbandScale.rangeBand();})
                  .y1(function(d) {return YbandScale(d.category)+YbandScale.rangeBand()-Ysmallscale(d.dy);})
                  .interpolate("basis");

            // Curvas acumuladas
            var stackedArea = d3.svg.area()
                  .x(function(d) {return Xscale(d.x);})
                  .y0(function(d) {return Yscale(d.basey);})
                  .y1(function(d) {return Yscale(d.basey+d.dy);})
                  .interpolate("basis");

            // Barras
            var barArea = d3.svg.area()
                  .x(function(d) {return Xscale(d.x);})
                  .y0(function(d) {return YbandScale(d.category)+YbandScale.rangeBand();})
                  .y1(function(d) {return YbandScale(d.category);}) 
                  .interpolate("basis");

            var yAxis = d3.svg.axis()
                          .scale(YbandScale)
                          //.tickSize(10)
                          .orient("left")

            svgContainer.select(".x.axis")
              .call(xAxis)

            svgContainer.select(".y.axis")
              .call(yAxis)




            // Determina el mayor valor en el eje Y acumulando todos los datos (todas las categorias)
            var maxYAccumulated = layout.maxYAccumulated(data);

            // Determina el mayor valor tomando las categorías por separado
            var maxYNonAcumulated = layout.maxYNonAccumulated(data);

         
            YbandScale.domain(layout.categories(data));
            Ysmallscale = d3.scale.linear().domain([0,maxYNonAcumulated]).range([0,YbandScale.rangeBand()]);

            svgContainer.select(".x.axis")
                .call(xAxis)
              .select("text.label")
                .text(xLabel);

            svgContainer.select(".y.axis")
                .call(yAxis)
              .select("text.label")
                .text(yLabel);



            var nodes = layout.nodes(data);

            var mantos = chartContainer.selectAll(".manto")
                      .data(nodes, function(d) {return d.category})
                      
            mantos
              .enter()
                .append("g")
                .attr("class", "manto")
                .append("path")
                .attr("fill", function(d) {return color(d.category)})
                .attr("opacity", 1)
                .on("click", function() {
                  chartType = "bars";
                  update();
                })


           var bars = chartContainer.selectAll(".bar")
              .data(nodes, function(d) {return d.category})

             
           bars   
              .enter()
                .append("g")
                .attr("class","bar")
                .append("rect")
                .on("click", function() {
                  chartType = "parallelCurves";
                  update();
                })

          bars   
              .exit()
              .remove()


          bars.selectAll("rect")  
            .data(nodes, function(d) {return d.category})
            .attr("x", 0)
            .attr("y", function(d,i) {return YbandScale(d.category)})
            .attr("width", function(d) {return Xscale(d.average)})
            .attr("fill", function(d) {return color(d.category)})
            .attr("height", YbandScale.rangeBand())


            mantos
              .exit()
              .remove()

            mantos.selectAll("path")
              .data(nodes, function(d) {return d.category})

            // Parallel Curves
            // ----------------
            if (chartType == "parallelCurves") {
             if (previouschartType=="bars") {
                mantos.selectAll("path")
                  .transition()
                  .delay(750)
                  .attr("d", function(d) {return barArea(d.data)})
                  .attr("opacity", 1)
                  .transition()
                  .duration(2000)
                  .attr("d", function(d) {return unstackedArea(d.data)})

                bars.selectAll("rect")
                  .attr("opacity", 1)
                  .transition()
                  .duration(1000)
                  //.attr("y", function(d,i) {return self.YbandScale(d.category)})
                  .attr("width", width)
                  .transition()
                  .attr("opacity", 0);
              } else if (previouschartType=="stackedCurves") {
                mantos.selectAll("path")
                  .transition()
                  .duration(2000)
                  .attr("d", function(d) {return unstackedArea(d.data)})

              } else if (previouschartType=="parallelCurves") {
                mantos.selectAll("path")
                  .transition()
                  .duration(2000)
                  .attr("d", function(d) {return unstackedArea(d.data)})

              }

            // Stacked Curves
            // ----------------
            } else if (chartType == "stackedCurves"){
              if (previouschartType=="stackedCurves") {
                 mantos.selectAll("path")
                  .transition()
                  .duration(2000)
                  .attr("d", function(d) {return stackedArea(d.data)})
              } else {
                mantos.selectAll("path")
                  .transition()
                  .duration(2000)
                  .attr("d", function(d) {return stackedArea(d.data)})
                  .attr("opacity", 1)

                bars.selectAll("rect")
                  .transition(2000)
                  .attr("opacity", 0);
              }

            // Bars
            // ----------------
            } else if (chartType == "bars"){
               if (previouschartType=="bars") {
                bars.selectAll("rect")
                  .transition()
                  .delay(2000)
                  .attr("width", function(d) {return Xscale(d.average)})

               } else {
                mantos.selectAll("path")
                  .transition()
                  .duration(1000)
                  .attr("d", function(d) {return barArea(d.data)})
                  .attr("opacity", 1)
                  .transition()
                  .attr("opacity", 0)


                bars.selectAll("rect")
                  .transition()
                  .delay(750)
                  .attr("width", width)
                  .attr("opacity", 1)
                  .transition()
                  .duration(2000)
                  .attr("width", function(d) {return Xscale(d.average)})
                  //.call(showBars)
               }


            }



          } //end if

          
        };

        scope.$watch("data", function () {
          render(scope.data);
        });      

        scope.$watch("chartType", function () {
          render(scope.data);
        });      

        scope.getElementDimensions = function () {
          return { 'h': element.height(), 'w': element.width() };
        };

        scope.$watch(scope.getElementDimensions, function (newValue, oldValue) {
          resizeSvg();
          render(scope.data);
        }, true);

        angular.element($window).bind('resize', function () {
          scope.$apply();
        });
 
      }
      
      
    };
  }]);


/**
* tided3.layout.Blanket
*
* Helper function to calculates coordinates for set of area shapes that represent an histogram of 
* subjects for different values of the measurement attribute
* use:
* nodes = BlanketLayout().nodes(data)
* input data format:
* [
* {category='A', measurement:"100", amount:"1324"}, 
* {category='A', measurement:"110", amount:"2543"},
* {category='B', measurement:"100", amount:"432"},
* {category='C', measurement:"110", amount:"654"},
* ]
*
* output data format:
* [
* {category:'A', 
* data:[
*     {x=100, dy=1324, basey=0},
*     {x=110, dy=2543, basey=0},
* ]},
* {category:'B', 
* data:[
*     {x=100, dy=432, basey=1324},
*     {x=110, dy=654, basey=2543},
* ]}
* ]
*/
angular.module("tide-angular")
.service("tdBlanketLayout", [function() {
  var self = this;
  var measurementAttribute = "simce"
  var categoryAttribute = "tamagno_curso"
  var amountAttribute = "estudiantes"

  var sortCriteria = function(d) {
     return d
  }

  /**
  * Calculates coordinates (x, dy, basey) for a group of area charts that can be stacked
  * each area chart is associated to a category in the data objects
  */
  this.nodes = function(data) {
    var categories = listCategories(data);

    var nodes = [];
    var values = [];

    _.each(categories, function(category) {
      var item = {};
      item.category = category;
      item.frequencies = convert(data, category);
      item.average = average(data, category);
      item.data = [];

      // Almacena todos los valores distintos de medidas utilizados en el histograma
      values = (_.union(values, _.keys(item.frequencies)));

      values = _.sortBy(values, function(d) {
        return parseFloat(d);
      })

      nodes.push(item);
    })

    fillBlanks(nodes, values);

    // Ordenar nodos por categoría (de acuerdo a función sort)
    nodes = _.sortBy(nodes, function(d) {return sortCriteria(d.category)})

    // Calcula coordenadas x, dy, basey (coordenada y de la curva en categoría anterior) y las almacena en nodes
    calculateCoordinates(nodes, values);

    return nodes;
  };

  this.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return this;
  }
  // Consulta o modifica el atributa utilizado para la medida en el histograma
  this.measurementAttribute = function(_) {
    if(!arguments.length) return measurementAttribute;
    measurementAttribute = _;
    return this;
  },

  // Consulta o modifica el atributa utilizado para la categoría que agrupa distintos mantos
  this.categoryAttribute = function(_) {
    if(!arguments.length) return categoryAttribute;
    categoryAttribute = _;
    return this;
  },

  // Consulta o modifica el atributa utilizado para la camntidad de sujetos por medida
  this.amountAttribute = function(_) {
    if(!arguments.length) return amountAttribute;
    amountAttribute = _;
    return this;
  },

  // Consulta o modifica el atributa utilizado para la camntidad de sujetos por medida
  this.sortCriteria = function(_) {
    if(!arguments.length) return sortCriteria;
    sortCriteria = _;
    return this;
  },


  this.maxYAccumulated = function(data) {
    var accumulatedValues = {}
    var categories = listCategories(data);

    _.each(data, function(d) {
      var prevValue = accumulatedValues[d[measurementAttribute]];
      var newValue =  prevValue? prevValue + parseFloat(d[amountAttribute]): parseFloat(d[amountAttribute]);
      accumulatedValues[d[measurementAttribute]] = newValue;
    })

    return _.max(_.values(accumulatedValues));

  };

  this.maxYNonAccumulated = function(data) {
    var groupedData = _.groupBy(data, function(d) {return d[categoryAttribute]});

    var categories = listCategories(data);

    var max = 0;

    _.each(categories, function(category) {
       var newMax =  self.maxYAccumulated(groupedData[category]);
       max = newMax > max ? newMax : max;
    })

    return max;

  };




  this.categories = function(data) {
    return _.sortBy(listCategories(data), sortCriteria);
  };

  // Build list of categories from input data
  var listCategories = function(data) {
    return _.uniq(_.pluck(data, categoryAttribute))
  };

 // Calculate the average measurement for all subjects in the category
  var average = function(data, category) {
    // Filtra datos de entrada segun dependencia
    var categorydata = _.filter(data, function(d){return d[categoryAttribute] == category});

    // Agrega suma de monto*medida
    var agregation = _.reduce(categorydata, function(memo,d) {
        return memo + parseInt(d[amountAttribute])*parseInt(d[measurementAttribute]);
    },0)

    var totalamount = _.reduce(categorydata, function(memo,d) {
        return memo + parseInt(d[amountAttribute]);
    },0)

    return agregation/totalamount;
  }

  // Convierte arreglo de datos a un objeto con la cantidad de individuos para cada valor
  var convert = function(data, category) {
    // Filtra datos de entrada segun dependencia
    var filtereddata = _.filter(data, function(d){return d[categoryAttribute] == category});

    // Agrupa los datos en un objeto según el puntaje SIMCE 
    var groupeddata = _.groupBy(filtereddata, function(d) {
      return d[measurementAttribute];
    });

    // Calcula la cantidad total de individuos para cada valor
    _.each(_.keys(groupeddata), function(key) {
      groupeddata[key] = _.reduce(groupeddata[key], function(memo,d) {
        return memo + parseInt(d[amountAttribute])
      },0)
    })

    return groupeddata;
  }

  // Creates measurements with 0 value when nonexistent 
  var fillBlanks = function(nodes, values) {
    _.each(nodes, function (node) {
      _.each(values, function(value) {
        if (!node.frequencies[value]) node.frequencies[value] = 0;
      })

    })
  }

  //  Generates arrays of data objects that include coordinattes x, dy, basey
  var calculateCoordinates = function(nodes, values) {
    _.each(values, function(value) {
      var baseY = 0;
      _.each(nodes, function (node) {
        var amount = node.frequencies[value];
        var item = {};
        item.x = value;
        item.dy = amount;
        item.basey = baseY;
        item.category = node.category;
        baseY += amount;
        node.data.push(item);
      })

    })

  }


}]);




/**
* Backbone view that creates an svg element with the given dimensions (width, height & margins)
* The view displays a Bar & Blanket representation of a set of elements with an xValue (continous) an y Value (Category)
*
* @param data {array} Array of objects, each with a set of attributes
* @param attributes {object} Definition of attributes used to handle the data
* @param attributes.xAttribute {string} attribute name for the X category values
* @param attributes.yAttribute {string} attribute name for the Y category values
* @param attributes.keyAttribute {string} attribute name for unique identifier of elements
* @param attributes.colorAttribute {string} attribute name for color category in objects
*
* Methods:
* {viewinstance}.setData(data)  updates data definition (used after applying filters)
* {viewinstance}.setAttributes(attributes) updates attribute definition (for changing categories)
* {viewinstance}.render() re-renders objects on the svg view
* 
* 
* @author Ernesto Laval
*/

/*
tided3.view.Blanket = Backbone.View.extend({

  initialize : function() {
    var self = this;

    _.bindAll(this, "render");

    // Get margin, width & height from options or assume default values
    if (this.options && this.options.margin) this.margin = this.options.margin
    else this.margin = {top: 30, right: 20, bottom: 30, left: 250};

    if (this.options && this.options.width) this.width = this.options.width
    else this.width = 1024 - this.margin.left - this.margin.right;

    if (this.options && this.options.height) this.height = this.options.height
    else this.height = 500 - this.margin.top - this.margin.bottom;

    // GET Data array from View collection
    if (this.options && this.options.data) this.allData = this.options.data
    else if (this.collection) this.allData = this.collection.toJSON()
    else this.allData = [];

    // Get attribute configuration 
    if (this.options && this.options.attributes) 
      this.attributes = this.options.attributes
    else if (App.attributes) 
      this.attributes = App.attributes
    else 
      this.attributes = {}

   // Get labels configuration 
    if (this.options && this.options.labels) 
      this.labels = this.options.labels
    else if (App.labels) 
      this.labels = App.labels
    else 
      this.labels = {}

   // Get sortCriteria (Function for getting order value for each item) 
    if (this.options && this.options.sortCriteria) 
      this.sortCriteria = this.options.sortCriteria
    else 
      this.sortCriteria = function(d) {
            if (d == "Municipal") return 1
            else if (d == "Particular Subvencionado") return 2
            else if (d == "Particular Pagado") return 3
            else return 4
          }

    // Tooltip
    this.tooltip = new tided3.view.Tooltip();
    // Reescribe función generadora del mensaje en tooltip
    this.tooltip.message = this.tootipMessage;

    this.layout = tided3.layout.Blanket()
          .categoryAttribute(this.attributes.colorAttribute)
          .measurementAttribute(this.attributes.xAttribute)
          .amountAttribute(this.attributes.yAttribute)
          .sortCriteria(this.sortCriteria);

    // Determina el rango de valores para eje X
    var xDomain = d3.extent(this.allData, function(d) {
      return +d[self.attributes.xAttribute]
    })

    // Determina el mayor valor en el eje Y acumulando todos los datos (todas las categorias)
    var maxYAccumulated = this.layout.maxYAccumulated(this.allData);

    // Determina el mayor valor tomando las categorías por separado
    var maxYNonAcumulated = this.layout.maxYNonAccumulated(this.allData);


    // Scales
    this.Yscale = d3.scale.linear().domain([0,maxYAccumulated]).range([this.height,0]);
    this.Xscale = d3.scale.linear().domain(xDomain).range([0,this.width]);
    this.YbandScale = d3.scale.ordinal().rangeBands([this.height,0], 0.2, 0.2)

    // Axis
    this.xAxis = d3.svg.axis()
                  .scale(this.Xscale);

    this.color = d3.scale.category10();

    this.YbandScale.domain(this.layout.categories(this.allData));
    this.Ysmallscale = d3.scale.linear().domain([0,maxYNonAcumulated]).range([0,this.YbandScale.rangeBand()]);

    this.data = this.allData;

    // Generadores de PATH elements para distintos tipos de cgráficos
    // Curvas Parallelas
    this.unstackedArea = d3.svg.area()
          .x(function(d) {return self.Xscale(d.x);})
          //.y0(function(d) {return self.Yscale(0+100);})
          .y0(function(d) {return self.YbandScale(d.category)+self.YbandScale.rangeBand();})
          .y1(function(d) {return self.YbandScale(d.category)+self.YbandScale.rangeBand()-self.Ysmallscale(d.dy);})
          .interpolate("basis");

    // Curvas acumuladas
    this.stackedArea = d3.svg.area()
          .x(function(d) {return self.Xscale(d.x);})
          .y0(function(d) {return self.Yscale(d.basey);})
          .y1(function(d) {return self.Yscale(d.basey+d.dy);})
          .interpolate("basis");

    // Barras
    this.barArea = d3.svg.area()
          .x(function(d) {return self.Xscale(d.x);})
          .y0(function(d) {return self.YbandScale(d.category)+self.YbandScale.rangeBand();})
          .y1(function(d) {return self.YbandScale(d.category);}) 
          .interpolate("basis");

   this.yAxis = d3.svg.axis()
                  .scale(this.YbandScale)
                  //.tickSize(10)
                  .orient("left")


    // Variable utilizada para identificar si gráficos comienzan apilados
    this.chartType = "bars";  // "bars" | "parallelCurves" | "stackedCurves"
    

    // Crea contenedor SVG de esta vista
    this.svg = d3.select(this.el)
      .append("svg")
        .attr("width",this.width+this.margin.left + this.margin.right)
        .attr("height", this.height+this.margin.top + this.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", this.width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(this.labels.xLabel);


    this.svg.append("g")
        .attr("class", "y axis")
        .call(this.yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(this.labels.yLabel);


    this.render();
  },


  render :function() {
    var self = this;

    // Determina el mayor valor en el eje Y acumulando todos los datos (todas las categorias)
    var maxYAccumulated = this.layout.maxYAccumulated(this.allData);

    // Determina el mayor valor tomando las categorías por separado
    var maxYNonAcumulated = this.layout.maxYNonAccumulated(this.allData);

 
    this.YbandScale.domain(this.layout.categories(this.allData));
    this.Ysmallscale = d3.scale.linear().domain([0,maxYNonAcumulated]).range([0,this.YbandScale.rangeBand()]);

    this.svg.select(".x.axis")
        .call(this.xAxis)
      .select("text.label")
        .text(this.labels.xLabel);

    this.svg.select(".y.axis")
        .call(this.yAxis)
      .select("text.label")
        .text(this.labels.yLabel);



    var nodes = this.layout.nodes(this.data);

    this.mantos = this.svg.selectAll(".manto")
              .data(nodes, function(d) {return d.category})
              
    this.mantos
      .enter()
        .append("g")
        .attr("class", "manto")
        .append("path")
        .attr("fill", function(d) {return self.color(d.category)})
        .attr("opacity", 1)
        .on("click", function() {
          self.chartType = "bars";
          self.update();
        })


   this.bars = this.svg.selectAll(".bar")
      .data(nodes, function(d) {return d.category})

      
   this.bars   
      .enter()
        .append("g")
        .attr("class","bar")
        .append("rect")
        .on("click", function() {
          self.chartType = "parallelCurves";
          self.update();
        })

  this.bars   
      .exit()
      .remove()


   this.bars.selectAll("rect")  
    .data(nodes, function(d) {return d.category})
    .attr("x", 0)
    .attr("y", function(d,i) {return self.YbandScale(d.category)})
    .attr("width", function(d) {return self.Xscale(d.average)})
    .attr("fill", function(d) {return self.color(d.category)})
    .attr("height", self.YbandScale.rangeBand())


    this.mantos
      .exit()
      .remove()

    this.mantos.selectAll("path")
      .data(nodes, function(d) {return d.category})

    // Parallel Curves
    // ----------------
    if (this.chartType == "parallelCurves") {
     if (this.previouschartType=="bars") {
        this.mantos.selectAll("path")
          .transition()
          .delay(750)
          .attr("d", function(d) {return self.barArea(d.data)})
          .attr("opacity", 1)
          .transition()
          .duration(2000)
          .attr("d", function(d) {return self.unstackedArea(d.data)})

        this.bars.selectAll("rect")
          .attr("opacity", 1)
          .transition()
          .duration(1000)
          //.attr("y", function(d,i) {return self.YbandScale(d.category)})
          .attr("width", this.width)
          .transition()
          .attr("opacity", 0);
      } else if (this.previouschartType=="stackedCurves") {
        this.mantos.selectAll("path")
          .transition()
          .duration(2000)
          .attr("d", function(d) {return self.unstackedArea(d.data)})

      } else if (this.previouschartType=="parallelCurves") {
        this.mantos.selectAll("path")
          .transition()
          .duration(2000)
          .attr("d", function(d) {return self.unstackedArea(d.data)})

      }

    // Stacked Curves
    // ----------------
    } else if (this.chartType == "stackedCurves"){
      if (this.previouschartType=="stackedCurves") {
         this.mantos.selectAll("path")
          .transition()
          .duration(2000)
          .attr("d", function(d) {return self.stackedArea(d.data)})
      } else {
        this.mantos.selectAll("path")
          .transition()
          .duration(2000)
          .attr("d", function(d) {return self.stackedArea(d.data)})
          .attr("opacity", 1)

        this.bars.selectAll("rect")
          .transition(2000)
          .attr("opacity", 0);
      }

    // Bars
    // ----------------
    } else if (this.chartType == "bars"){
       if (this.previouschartType=="bars") {
        this.bars.selectAll("rect")
          .transition()
          .delay(2000)
          .attr("width", function(d) {return self.Xscale(d.average)})

       } else {
        this.mantos.selectAll("path")
          .transition()
          .duration(1000)
          .attr("d", function(d) {return self.barArea(d.data)})
          .attr("opacity", 1)
          .transition()
          .attr("opacity", 0)


        this.bars.selectAll("rect")
          .transition()
          .delay(750)
          .attr("width", this.width)
          .attr("opacity", 1)
          .transition()
          .duration(2000)
          .attr("width", function(d) {return self.Xscale(d.average)})
          //.call(showBars)
       }


    }
 },

  // Modifica el tipo de gráfico a mostrar (barra, manto o manto acumulado)
  setChartOption : function(option) {
    this.previouschartType = this.chartType;
    this.chartType = option;
    this.render()
  },
  
  setData: function(data) {
    this.previouschartType = this.chartType;
    this.data = data;
    this.render();
  },

  setAttributes: function(attributes) {
    this.attributes = attributes;

    this.layout 
      .categoryAttribute(this.attributes.colorAttribute)
      .measurementAttribute(this.attributes.xAttribute)
      .amountAttribute(this.attributes.yAttribute)

    this.render();
  },



  /**
  * Reescribe función generador de mensajes utilizado en herramienta de tooltip
  * tooltip.tooltipMessage(data)  
  *
  * @param {object} data objeto con atributos (Ej: {nombre: "Juan", Edad: 18}) utilizados en la creación del mensaje a desplegar por tooltip
  * @returns {string} Mensaje (html) a ser utilizado por tooltip
  */
/*  tootipMessage : function(d) {
  
    var formatMiles = d3.format(",d");
    var formatDecimal = d3.format('.2f')

    msg = "<strong>Id: "+d.id;
  
    
    return msg;
  },




});*/
