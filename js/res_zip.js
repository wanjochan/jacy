function call7z(sdir,fnzip0,fnames,sextra_arg){
	if(!fnames.length){return;}
	var s_7z_2=["7z","a"];
	if(sextra_arg){
		s_7z_2.push(sextra_arg);
	}
	s_7z_2.push(fnzip0);
	s_7z_2=s_7z_2.concat(fnames);
	if(g_current_arch=="win32"||g_current_arch=="win64"){
		s_7z_2.push(">NUL")
		var scmd="@echo off\n"+shellcmd(["cd","/d",sdir])+"\n"+shellcmd(s_7z_2)+"\n";
		var scall7z=g_work_dir+"/call7z.bat";
		if(!CreateFile(scall7z,scmd)){
			throw new Error("can't create call7z.bat");
		}
		var ret=shell([scall7z]);
		if(!!ret){shell(["rm",fnzip0]);throw new Error("7z returned an error code '@1'".replace("@1",ret.toString()));}
	}else{
		var scmd="#!/bin/sh\n"+shellcmd(["cd",sdir])+"\n"+shellcmd(s_7z_2)+"\n";
		var scall7z=g_work_dir+"/call7z.sh";
		if(!CreateFile(scall7z,scmd)){
			throw new Error("can't create call7z.sh");
		}
		var ret=shell(["/bin/sh",scall7z]);
		if(!!ret){
			shell(["rm",fnzip0]);
			throw new Error("7z returned an error code '@1'".replace("@1",ret.toString()));
		}
	}
}

(function(){
	var is_static=(g_json.use_static_res&&g_json.use_static_res[0]);
	var fn_filecount=g_work_dir+"/res_zip_count.txt";
	if(!FileExists(fn_filecount)){
		CreateFile(fn_filecount,0);
	}
	var old_n_files=parseInt(ReadFile(fn_filecount));
	var fnzip=(is_static?g_work_dir+"/raw_res.zip":g_bin_dir+"/res.zip");
	if(g_arch=="ios"||g_arch=="mac"){
		fnzip=g_work_dir+"/reszip.bundle";
	}
	if (g_arch=="android"){
		mkdir(g_work_dir+"/assets");
		fnzip=g_work_dir+"/assets/reszip.mp3";
	}
	var needed=0;
	var res_files=find(g_base_dir+"/res/*");
	var n_files=0;
	if(!FileExists(fnzip)){
		needed=1;
	}
	for(var i=0;i<res_files.length;i++){
		var fn=res_files[i];
		n_files++;
		if(IsNewerThan(fn,fnzip)){
			needed=1;
		}
	}
	if(g_json.js_units){
		for(var i=0;i<g_json.js_units.length;i++){
			var fn_in_zip=g_json.js_units[i];
			var fn=g_root+"/units/"+fn_in_zip;
			n_files++;
			if(IsNewerThan(fn,fnzip)){
				needed=1;
			}
		}
	}
	var files=find(g_base_dir+"/assets/*")
	for(var i=0;i<files.length;i++){
		var fn=files[i];
		n_files++;
		if(IsNewerThan(fn,fnzip)){
			needed=1;
		}
	}
	if(g_json.extra_resource_dirs){
		for(var di=0;di<g_json.extra_resource_dirs.length;di++){
			var files=find(g_base_dir+"/"+g_json.extra_resource_dirs[di]+"/*")
			for(var i=0;i<files.length;i++){
				var fn=files[i];
				n_files++;
				if(IsNewerThan(fn,fnzip)){
					needed=1;
				}
			}
		}
	}
	if(old_n_files!==n_files){
		needed=1;
	}
	if(!needed){
		if(is_static){
			var fn_res_zip_c=g_work_dir+"/s7res.c";
			g_json.c_files.push(fn_res_zip_c)
		}
		return;
	}
	CreateFile(fn_filecount,n_files.toString());
	var fnzip0=(is_static?g_work_dir+"/raw_res.zip":g_bin_dir+"/res.zip");
	var fnzip_temp="__temp__.zip";
	if(FileExists(fnzip)){
		var ret=shell(["rm",fnzip]);
		if(!!ret){throw new Error("rm returned an error code '@1'".replace("@1",ret.toString()));}
	}
	if(FileExists(fnzip0)){
		var ret=shell(["rm",fnzip0]);
		if(!!ret){throw new Error("rm returned an error code '@1'".replace("@1",ret.toString()));}
	}
	if(FileExists(g_base_dir+"/"+fnzip_temp)){
		var ret=shell(["rm",g_base_dir+"/"+fnzip_temp]);
		if(!!ret){throw new Error("rm returned an error code '@1'".replace("@1",ret.toString()));}
	}
	//png/ttf/otf/bin should use 7z-raw
	var s_7z_0=[];
	var s_7z_1=[];
	var pfn_in_zip=g_base_dir.length+1;
	var regex_do_not_zip=new RegExp(".*\\.(png|ttf|otf|bin)","i");
	for(var i=0;i<res_files.length;i++){
		var fn=res_files[i];
		var fn_in_zip=fn.substr(pfn_in_zip);
		if(fn.match(regex_do_not_zip)){
			s_7z_0.push(fn_in_zip);
		}else{
			s_7z_1.push(fn_in_zip);
		}
	}
	call7z(g_base_dir,fnzip_temp,s_7z_0,"-mx=0")
	call7z(g_base_dir,fnzip_temp,s_7z_1)
	if(g_json.extra_resource_dirs){
		for(var di=0;di<g_json.extra_resource_dirs.length;di++){
			call7z(g_base_dir,fnzip_temp,g_json.extra_resource_dirs[di]);
		}
	}
	var s_7z_2=[];
	var ret=shell(["mv",g_base_dir+"/"+fnzip_temp,g_root+"/units/"+fnzip_temp]);
	if(!!ret){throw new Error("mv returned an error code '@1'".replace("@1",ret.toString()));}
	//coulddo: JS minify: standard gui2d scripts, rely on json for file picking: js_units
	if(g_json.js_units){
		for(var i=0;i<g_json.js_units.length;i++){
			var fn_in_zip=g_json.js_units[i];
			var fn=g_root+"/units/"+fn_in_zip;
			if(FileExists(fn)){
				s_7z_2.push(fn_in_zip);
			}
		}
	}
	call7z(g_root+"/units",fnzip_temp,s_7z_2)
	if(DirExists(g_base_dir+"/assets")){
		//ret=shell([g_root+"/js/rawzip.exe",fnzip0,g_base_dir+"/assets"]);
		ret=rawzip(g_root+"/units/"+fnzip_temp,g_base_dir+"/assets")
		if(!!ret){throw new Error("rawzip returned an error code '@1'".replace("@1",ret.toString()));}
	}
	ret=shell(["mv",g_root+"/units/"+fnzip_temp,fnzip0]);
	if(!!ret){throw new Error("mv returned an error code '@1'".replace("@1",ret.toString()));}
	if(is_static){
		var fn_res_zip_c=g_work_dir+"/s7res.c";
		zip2c(fnzip0,fn_res_zip_c)
		g_json.c_files.push(fn_res_zip_c)
	}else{
		if(fnzip!=fnzip0){
			ret=shell(["mv",fnzip0,fnzip]);
			if(!!ret){throw new Error("mv returned an error code '@1'".replace("@1",ret.toString()));}
		}
	}
})();
