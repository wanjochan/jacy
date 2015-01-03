Duktape.__ui_add_path("test")
//Duktape.__ui_add_path("../ide/assets")
Duktape.__ui_add_path("../ide/res")

//the duktape with system is completely unusable - we have to put all exports in the global object
require("gui2d/ui");
require("gui2d/widgets");

UI.default_styles.button={
	transition_dt:0.1,
	round:24,border_width:3,padding:12,
	$:{
		out:{
			border_color:0xffcc773f,color:0xffffffff,
			icon_color:0xffcc773f,
			text_color:0xffcc773f,
		},
		over:{
			border_color:0xffcc773f,color:0xffcc773f,
			icon_color:0xffffffff,
			text_color:0xffffffff,
		},
		down:{
			border_color:0xffaa5522,color:0xffaa5522,
			icon_color:0xffffffff,
			text_color:0xffffffff,
		},
	}
};

var demo_text_animation=function(id,attrs){
	var state=UI.GetState(id,attrs);
	if(!state.anim_x){state.anim_x=0;state.danim_x=1;}
	state.text=state.text||"Grumpy wizards make toxic brew for the evil Queen and Jack.";//"The quick brown fox jumps over a lazy dog.";
	state.font=state.font||"RobotoCondensed-Regular";//"segoeui";
	UI.Begin(attrs);
		var wnd=UI.Begin(Window("app",{title:"GUI hello world",w:1024,h:768,bgcolor:0xff000000,designated_screen_size:1440,flags:UI.SDL_WINDOW_MAXIMIZED|UI.SDL_WINDOW_RESIZABLE,is_main_window:1}))
			Hotkey("",{mod:UI.KMOD_LALT,key:UI.SDLK_F4,action:function(){UI.DestroyWindow(wnd)}});
			FillRect("",{x:state.anim_x+10,y:10, w:200,h:100,color:0xff0000ff});
			FillRect("",{x:state.anim_x+10,y:120,w:200,h:100,color:0xff00ff00});
			FillRect("",{x:state.anim_x+10,y:230,w:200,h:100,color:0xffff0000});
			FillRect("",{x:wnd.w/2,y:0,w:wnd.w/2,h:wnd.h,color:0xffffffff});
			RoundRect("",{x:wnd.w/2+state.anim_x+10,y:10, w:200,h:100,border_width:0,round:16,color:0xffe0e0ff,border_color:0xff00007f});
			RoundRect("",{x:wnd.w/2+state.anim_x+10,y:120,w:200,h:100,border_width:1,round:16,color:0xffe0ffe0,border_color:0xff007f00});
			RoundRect("",{x:wnd.w/2+state.anim_x+10,y:230,w:200,h:100,border_width:4.5,round:16,color:[{x:0,y:0,color:0xff7f0000},{x:1,y:1,color:0xffffe0e0}],border_color:0xff7f0000});
			Bitmap("",{x:wnd.w/2+state.anim_x+10,y:10,file:"test/res/edico.png"})
			Button("ok",{
				x:16,y:wnd.h-110,
				font:UI.Font("ArialUni",48),text:"OK",
				OnClick:function(){UI.DestroyWindow(wnd)}});
			Button("cancel",{
				x:wnd.w-316,y:wnd.h-110,
				icon:"test/res/check_64.png",
				font:UI.Font("dsanscn",48,true),text:"漢字",
				OnClick:function(){state.text="世の中に、必要な悪があるなんて、子供たちに教えたくありません"}})
			var y0=340;
			var s_text=state.text;
			for(var i=12;i<68;i*=1.07){
				//Text("",{x:state.anim_x+10,y:y0,font:UI.Font("cambria",i),text:"Hello world!",color:0xff000000})
				Text("",{x:state.anim_x+10,y:y0,font:UI.Font(state.font,i),text:s_text,color:0xffffffff})
				Text("",{x:wnd.w/2+state.anim_x+10,y:y0,font:UI.Font(state.font,i),text:s_text,color:0xff000080})
				y0+=i;
			}
		UI.End();
		state.anim_x+=state.danim_x;
		if(state.anim_x>180){state.danim_x=-1}
		if(state.anim_x<10){state.danim_x=1}
		UI.Refresh()
	UI.End();
};

var demo_msgbox=function(id,attrs){
	var state=UI.GetState(id,attrs);
	UI.Begin(attrs);
		var wnd=UI.Begin(Window("app",{title:"GUI example",w:1024,h:768,bgcolor:0xffffffff,designated_screen_size:1440,flags:UI.SDL_WINDOW_RESIZABLE,is_main_window:1}))
			Hotkey("",{mod:UI.KMOD_LALT,key:UI.SDLK_F4,action:function(){UI.DestroyWindow(wnd)}});
			Hotkey("",{key:UI.SDLK_ESCAPE,action:function(){UI.DestroyWindow(wnd)}});
			Text("",{
				anchor:UI.context_parent,anchor_align:"left",anchor_valign:"up",
				w:UI.context_parent.w-32,
				x:16,y:16,
				font:UI.Font("arial",24),text:"For simplicity, our compiler uses the AST (Abstract Syntax Tree) directly as our IR. As an example, \\figref{ast:raw}(a) shows a simple code snippet written in our DSL. \\figref{ast:raw}(b) shows the corresponding raw AST generated by the parser, where each inner node is formatted as a C-like function call using its children as arguments, and each leaf node is formatted as a variable, a string, or a number. The \\texttt{symderiv} call in \\figref{ast:raw} is a meta-function that returns a new function that computes the partial derivatives of an input function (its first argument \\texttt{f}) with respect to a specific set of parameters (the remaining argument \\texttt{u}). Prior to computing symbolic derivatives, we flatten all structure types, turning their components into simple scalar variables and update relevant \\texttt{symderiv} calls accordingly, as illustrated in \\figref{ast:raw}(c). Without loss of generality, in the following we will assume that all vector and tensor types have been flattened already and all relevant variables are of scalar types. We also assume that conventional compiler optimizations has already eliminated trivial inefficiencies such as unused variables from the input function.",
				color:0xff000000});
			Button("ok",{
				anchor:UI.context_parent,anchor_align:"left",anchor_valign:"down",
				x:16,y:16,
				font:UI.Font("Inconsolata.ttf",48),text:"OK",
				OnClick:function(){
					UI.DestroyWindow(wnd);
				}});
			Button("Cancel",{
				anchor:UI.context_parent,anchor_align:"right",anchor_valign:"down",
				x:16,y:16,
				font:UI.Font("Inconsolata.ttf",48),text:"Cancel",
				OnClick:function(){
					UI.DestroyWindow(wnd);
				}});
		UI.End();
	UI.End();
};

var demo_msgboxb=function(id,attrs){
	var state=UI.GetState(id,attrs);
	UI.Begin(attrs);
		var wnd=UI.Begin(Window("app",{title:"GUI example",w:1024,h:768,bgcolor:0xff000000,designated_screen_size:1440,flags:UI.SDL_WINDOW_RESIZABLE,is_main_window:1}))
			Hotkey("",{mod:UI.KMOD_LALT,key:UI.SDLK_F4,action:function(){UI.DestroyWindow(wnd)}});
			Hotkey("",{key:UI.SDLK_ESCAPE,action:function(){UI.DestroyWindow(wnd)}});
			Text("",{
				anchor:UI.context_parent,anchor_align:"left",anchor_valign:"up",
				w:UI.context_parent.w-32,
				x:16,y:16,
				font:UI.Font("arial",24),text:"For simplicity, our compiler uses the AST (Abstract Syntax Tree) directly as our IR. As an example, \\figref{ast:raw}(a) shows a simple code snippet written in our DSL. \\figref{ast:raw}(b) shows the corresponding raw AST generated by the parser, where each inner node is formatted as a C-like function call using its children as arguments, and each leaf node is formatted as a variable, a string, or a number. The \\texttt{symderiv} call in \\figref{ast:raw} is a meta-function that returns a new function that computes the partial derivatives of an input function (its first argument \\texttt{f}) with respect to a specific set of parameters (the remaining argument \\texttt{u}). Prior to computing symbolic derivatives, we flatten all structure types, turning their components into simple scalar variables and update relevant \\texttt{symderiv} calls accordingly, as illustrated in \\figref{ast:raw}(c). Without loss of generality, in the following we will assume that all vector and tensor types have been flattened already and all relevant variables are of scalar types. We also assume that conventional compiler optimizations has already eliminated trivial inefficiencies such as unused variables from the input function.",
				color:0xffffffff});
			Button("ok",{
				anchor:UI.context_parent,anchor_align:"left",anchor_valign:"down",
				x:16,y:16,
				font:UI.Font("Inconsolata.ttf",48),text:"OK",
				OnClick:function(){
					UI.DestroyWindow(wnd);
				}});
			Button("Cancel",{
				anchor:UI.context_parent,anchor_align:"right",anchor_valign:"down",
				x:16,y:16,
				font:UI.Font("Inconsolata.ttf",48),text:"Cancel",
				OnClick:function(){
					UI.DestroyWindow(wnd);
				}});
		UI.End();
	UI.End();
};

UI.Application=demo_msgbox;

UI.Run()