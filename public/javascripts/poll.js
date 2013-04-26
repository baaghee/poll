
var Poll = {};
Poll.loadpoll = function(id){
	$.getJSON('/get-poll/' + id, function(_poll){
		//set title
		var total = _poll.total;
		var poll = _poll.poll;
		$("#poll-title").text(poll.title).attr("data-id", poll._id);
		
		var poll_type = poll.type == "Open poll" ? "<h5>Open Poll</h5><div>This is an open poll. Administrators will see your submission.</div>" : "<h5>Anonymous Poll</h5><div>This vote will be taken anonymously. Your identity will be hidden from administrators.</div>";
		$("#poll-audience").html(poll_type);
		$("#poll-expiry").text(moment(poll.expire).format("MMM Do"));
		$("#poll-taken").text(total);
		$("#questions").html('');
		poll.questions.forEach(function(item, index){
			var html = "";
			var type = "";
			if(typeof item.choice != 'undefined' && item.choice.length > 0){
				type = "choice";
				var buttons = "";
				item.choice.forEach(function(choice){
					buttons += '<button type="button" class="btn btn-info">'+choice+'</button>';
				});
	
				html = '<div class="btn-group" data-toggle="buttons-radio">'+buttons+'</div>';
			}else if(typeof item.multiple_choice != 'undefined'  && item.multiple_choice.length > 0){
				type = "multiple_choice";		
				var buttons = "";
				item.multiple_choice.forEach(function(choice){
					buttons += '<button type="button" class="btn btn-info">'+choice+'</button>';
				});
	
				html = '<div class="btn-group" data-toggle="buttons-checkbox">'+buttons+'</div>';			
			}else if(typeof item.text != 'undefined' && item.text > 0){
				type = "text";
				var textboxes = "";
				for(var i=1;i<=item.text; i++){
					textboxes += "<div><textarea placeholder='Answer "+i+"'></textarea></div>";
				}
				html = '<div>'+textboxes+'</div>';			
			}
			
			$("#questions").append("<section class='question' data-id='"+ item._id +"' data-type='"+ type +"' data-required='"+ item.required +"'><h2><span>"+ (index + 1) + '</span>&nbsp;&nbsp;' + item.title +"</h2><section class='survey-content'>"+html+"</section></section>");
		});
	
	});
}

$(function(){
	//sample survey
	$.getJSON("/all-polls", function(res){
		res.forEach(function(e){
			$("#poll-menu").append("<li><a href='/"+e._id+"'>"+e.title+"</a></li>");
		});
	});


	//validate and post poll
	$("#submit-survey").on("click", function(){
		var data = [];
		var id = $("#poll-title").attr('data-id');
		$(".question").each(function(){
			var entry = {}
			var self = $(this);
			var question = self.attr('data-id');
			
			var answer;
			var required = self.attr("data-required") == "true" ? true : false;
			var type = self.attr("data-type");

			var contents = self.find(".survey-content");
			
			
			if(type == "choice"){
				var ans = contents.find(".active");
				if(ans.length == 0 && required){
					alert("Required question unanswered");
					return;
				}
				answer = ans.text();
				
			}else if(type == "multiple_choice"){
				var ans = contents.find(".active");
				if(ans.length == 0 && required){
					alert("Select atleast one option");
					return;
				}
				answer = [];
				ans.each(function(){
					answer.push($(this).text());
				});
				
			}else if(type == "text"){
				var textboxes = contents.find("textarea");
				var filled = true;
				answer = [];
				textboxes.each(function(){
					var textbox = $(this);
					if(textbox.val() == ""){
						filled = false;
					}
					answer.push( textbox.val() );
				});
				
				if(required == true && filled == false){
					alert("Textbox not filled");
					return;
				}
			}
			
			entry.question = question;
			entry.answer = answer;
			data.push(entry);
		});
		var cname = $("#cname").val();
		var cemail = $("#cemail").val();
		var cvilla = $("#cvilla").val();
		var cnationality = $("#cnationality").val();
		var cfrom = $("#cfrom").val();
		var cto = $("#cto").val();
		var post = {
			data:JSON.stringify(data), 
			poll:id,
			cname:cname,
			cemail:cemail,
			cvilla:cvilla,
			cnationality:cnationality,
			cfrom:cfrom,
			cto:cto
		}
		$.post('/submit-poll', post, function(res){
			if(res._id){
					window.location = "http://" + window.location.host + "/k";
			}
		});
	});
	$("body").on("click", "#new-question .btn", function(){
		var self = $(this);
		var type = self.attr("data-type");
		var html = "";
		
		if(type == "choice"){
			var temp = [
				"<h3>Choice</h3>",
				'<input type="checkbox"  class="poll-required" /> Required',
				"<div><input type='text' class='poll-title' placeholder='question' /></div>",
				"<div><textarea class='poll-question-choice' placeholder='each choice must be written in a new line'></textarea></div>"
			];
			html = temp.join("");
		}
		else if(type == "multiple_choice"){
			var temp = [
				"<h3>Multiple Choice</h3>",
				'<input type="checkbox"  class="poll-required" /> Required',
				"<div><input type='text' class='poll-title' placeholder='question' /></div>",
				"<div><textarea class='poll-question-choice' placeholder='each choice must be written in a new line'></textarea></div>"
			];
			html = temp.join("");
		}
		else if(type == "text"){
			var temp = [
				"<h3>Text</h3>",
				'<input type="checkbox" class="poll-required" /> Required',
				"<div><input type='text' class='poll-title' placeholder='question' /></div>",
				"<div><div>Number of inputs</div><select class='poll-question-text'><option value='1'>1</option><option value='2'>2</option><option value='3'>3</option><option value='4'>4</option><option value='5'>5</option></select></div>"
			];
			html = temp.join("");
		}
		var remove = "<button class='btn pull-right remove-poll'><i class='icon-remove-sign'></i></button>";
		html = "<div data-type='"+type+"' class='question-view hide'>"+remove+html+"</div>";
		html = $(html);
		$("#questions_display").append(html);
		html.slideDown("fast");
	});
	$("body").on("click", ".remove-poll", function(){
		var self = $(this);
		self.parent().slideUp("fast",function(){
			self.parent().remove();
		});
	});
	$("body").on("click", "#create-poll", function(){
		var title = $("#polltitle").val();
		if(title == ""){
			return alert("Please type a name for this poll");
		}
		var type = $("#poll-type .btn.active").text();
		if(type == ""){
			return alert("Please select a type");
		}
		var questions = $(".question-view");
		if(questions.length == 0){
			return alert("Please create few questions");
		}
		var expire = $("#poll-expiry").val();
		if(expire == ""){
			return alert("set an expiry date");
		}
		var questions_data = [];
		var done = true;
		questions.each(function(){
			var el = $(this);
			var title = el.find('.poll-title').val();
			if(title == ""){
				done = false;
				alert("Please type a question");
			}
			var obj = {
				title:title,
				required: el.find('.poll-required').is(":checked")
			};
			
			var type = $(el).attr("data-type");
			if(type == "choice" || type == "multiple_choice"){
				var choice = el.find(".poll-question-choice").val();
				choice = choice.trim().split("\n");
				obj[type] = choice;
			}else if(type == "text"){
				obj[type] = parseInt(el.find(".poll-question-text").val())
			}
			
			questions_data .push(obj);
		});
		if(!done){
			return;
		}
		var data = JSON.stringify({
			title:title,
			questions:questions_data,
			type:type,
			expire:expire
		});
		console.log(data);
		$.post('/create-poll', {data:data}, function(res){
			window.location = 'http://'+ window.location.host + "/" + res._id;
		});
	});
	
	$("body").on("click", "#poll-retrieve li a", function(){
		var self = $(this);
		self.parent().siblings().removeClass('poll-selected');
		self.parent().addClass('poll-selected');
		var id = $(this).attr("data-id");
		id = id.replace(/\"/g, "");
		$.getJSON("/poll/" + id, function(data){
			var normalize = {
				title : data.poll.title,
				total_polls : data.data.length,
				daily_polls: 0,
				expire:moment(data.poll.expire).format("MMM Do"),
				created:moment(data.poll.date).format("MMM Do")
			}
			
			//extract dates
			var dates = {}
			data.data.forEach(function(question){
				var created = new Date(question.date);
				var poll_date = created.getDate() +"/" +  (created.getMonth() + 1) + "/"  +created.getUTCFullYear();
				if(poll_date in dates){
					dates[poll_date] = dates[poll_date] + 1;
				}else{
					dates[poll_date] =  1
				}
			});
			
			var norm = [];
			for(date in dates){
				var o = {};
				o.name = date;
				o.y = dates[date];
				norm.push(o);
			}	
			normalize.daily_polls = norm;
			
			var rendered = jade.render("poll-display", normalize);
			$("#statistics").html(rendered);
			

			
			//draw
				// Instantiate and render the chart
				new Highcharts.Chart({
				    chart: {
				        renderTo: 'linegraph',
				        plotBackgroundColor: null,
				        plotBorderWidth: null,
				        plotShadow: false
				    },
				    title: {
				        text: 'History'
				    },
				    tooltip: {
					    pointFormat: '{series.name}: <b>{point.y}</b>',
				    	percentageDecimals: 1
				    },
				    plotOptions: {
				        pie: {
				            allowPointSelect: true,
				            cursor: 'pointer',
				            dataLabels: {
				                enabled: true,
				                color: '#000000',
				                connectorColor: '#000000',
				                formatter: function() {
				                	console.log(this.point);
				                    return '<b>'+ this.point.name +'</b>: '+ this.percentage +' %';
				                }
				            }
				        }
				    },
				    series: [{
				        type: 'pie',
				        name: 'Polls taken',
				        data: normalize.daily_polls
				    }]
				});
				//create sections for all questions
				data.poll.questions.forEach(function(question){
					var id = question._id;
					$("#questions-display").append(jade.render("question-display", question));
					
					//find answers of the questions
					var q = {};
					var cont = true;
					data.data.forEach(function(p){
						p.answers.forEach(function(ans){
							
							if(typeof question.text != 'undefined' && question.text > 0){
								if(typeof ans.answer == 'string'){
									return $("#q" + id).append("<h4>"+user_answers+"</h4>");
								}
								ans.answer.forEach(function(user_answers){
									$("#q" + id).append("<h4>"+user_answers+"</h4>");
								});
								cont = false;
							}else if(ans.question == id){
								q[ans.answer] = typeof  q[ans.answer] == "undefined" ? 1 : q[ans.answer] += 1;
							}						
						});
					});
					if(cont == false){
						return;
					}
					var norm = [];
					for(a in q){
						var o = {};
						o.name = a;
						o.y = q[a];
						norm.push(o);
					}
					//render chart for each question
					new Highcharts.Chart({
						chart: {
						    renderTo: "q" + id,
						    plotBackgroundColor: null,
						    plotBorderWidth: null,
						    plotShadow: false
						},
						title: {
						    text: 'History'
						},
						tooltip: {
							pointFormat: '{series.name}: <b>{point.y}</b>',
							percentageDecimals: 1
						},
						plotOptions: {
						    pie: {
						        allowPointSelect: true,
						        cursor: 'pointer',
						        dataLabels: {
						            enabled: true,
						            color: '#000000',
						            connectorColor: '#000000',
						            formatter: function() {
						            	console.log(this.point);
						                return '<b>'+ this.point.name +'</b>: '+ this.percentage +' %';
						            }
						        }
						    }
						},
						series: [{
						    type: 'pie',
						    name: 'Polls taken',
						    data: norm
						}]
					});

	
				});
						
			
		});
	});
	$("#send-email").click(function(){
		var emails = $("#send-email-recipients").val().trim();
		var poll = $(this).attr('data-poll');
		$.post("/invite",{poll:poll, emails:emails}, function(){
			alert("Emails sent");
		});
	})
});














