var re_backslash=new RegExp("\\\\","g")
var onlydir=function(sdir,serr){
	var files=ls(sdir)
	if(!files.length){
		die("can't find "+serr+'\n')
	}else{
		return files[0].replace(re_backslash,"/")
	}
}

var ANDROID={}
ANDROID.Detect=function(){
	ANDROID.ndk=onlydir(g_config.ADK_PATH+"/*-ndk-*","ndk")
	ANDROID.adt=onlydir(g_config.ADK_PATH+"/adt-*","adt")
	ANDROID.jdk=onlydir(g_config.ADK_PATH+"/jdk*","jdk")
	ANDROID.ant_home=onlydir(ANDROID.adt+"/eclipse/plugins/org.apache.ant*","ant")
	if(g_json.is_library){
		ANDROID.skeleton=onlydir(g_config.ADK_PATH+"/skeleton_lib","skeleton_lib")
	}else{
		ANDROID.skeleton=onlydir(g_config.ADK_PATH+"/skeleton_project","skeleton_project")
	}
	ANDROID.adt_platform=onlydir(ANDROID.adt+"/sdk/platforms/android-*","adt_platform")
	ANDROID.adb_exe=ANDROID.adt+"/sdk/platform-tools/adb.exe"
	var paths=[];
	if(g_current_arch=="win32"||g_current_arch=="win64"){
		paths=ExpandEnvironmentStrings("%PATH%").split(";").map(function(s){return s.replace(/[\\]/g,'/');});
	}else{
		paths=ExpandEnvironmentStrings("${PATH}").split(":");
	}
	for(var i=0;i<paths.length;i++){
		if(FileExists(paths[i]+'/adb.exe')){
			ANDROID.adb_exe=paths[i]+'/adb.exe';
		}
	}
	ANDROID.c_file_list=[];
}

var re_url=new RegExp("[ \t]*(.*)[ \t]*");
var CopyJavaFile=function(fn0){
	var fn=SearchForFile(fn0);
	var stext=ReadFile(fn);
	var ppackage=stext.indexOf('package ');
	if(ppackage<0){
		die("error: I don't know what package the file '",fn,"' is supposed to be in")
	}
	var psemic=stext.indexOf(';',ppackage)
	if(psemic<0){
		die("error: I don't recognize the package statement syntax in '",fn,"'");
	}
	var package_url=stext.substr(ppackage+8,psemic-(ppackage+8))
	package_url=package_url.match(re_url)[1].replace(new RegExp(".","g"),"/")
	var spackage_dir=g_work_dir+"/src/"+package_url
	mkdir(spackage_dir)
	var star=spackage_dir+"/"+RemovePath(fn)
	UpdateTo(star,fn)
}

var CopyJarFile=function(fn0){
	var fn=SearchForFile(fn0);
	var spackage_dir=g_work_dir+"/libs";
	mkdir(spackage_dir)
	var star=spackage_dir+"/"+RemovePath(fn)
	UpdateTo(star,fn)
}

//var CopyCFile=function(fn0){
//	var fn=fn0
//	var star=g_work_dir+"/jni/"+RemovePath(fn)
//	UpdateTo(star,fn)
//	ANDROID.c_file_list.push(RemovePath(fn))
//};

var CopySkeletonFile=function(dir_tar,fn,dir_src0){
	var dir_src=(dir_src0||dir_tar)
	mkdir(g_work_dir+dir_tar)
	UpdateTo(g_work_dir+dir_tar+"/"+fn,ANDROID.skeleton+dir_src+"/"+fn)
};

g_action_handlers.make=function(){
	ANDROID.Detect()
	ANDROID.is_release=(g_build!="debug")
	//////////////////////////////////////
	//unzip pass: the skeleton project and the .so libs should work this way
	var s_original_dir=pwd()
	mkdir(g_work_dir+"/touch")
	var libs=g_json.lib_files
	var re_zip=new RegExp(".*\\.zip");
	var lib_dirs=g_json.lib_dirs
	if(lib_dirs){
		for(var i=0;i<lib_dirs.length;i++){
			var fn=lib_dirs[i]
			fn=SearchForDir(fn);
			//var fntouch=g_work_dir+"/touch"+RemovePath(fn)+"._touch"
			//if(IsNewerThan(fn,fntouch)){
			//dir in lib_dirs, just copy there
			//shell(["rsync","-r",fn+'/*',g_work_dir+'/'])
			rsync(fn+'/',g_work_dir+'/jni/');
			//CreateFile(fntouch,fn)
			//}
		}
	}
	if(libs){
		for(var i=0;i<libs.length;i++){
			var fn=libs[i]
			if(fn.toLowerCase().match(re_zip)){
				var fntouch=g_work_dir+"/touch"+RemovePath(fn)+"._touch"
				if(IsNewerThan(fn,fntouch)){
					//.zip in libs, just extract there
					shell(["7z","x",fn])
					CreateFile(fntouch,fn)
				}
			}
		}
	}
	//////////////////////////////////////
	//64-bit build
	if(g_json.android_enable_arm64){
		var fn_c_32=g_work_dir+"/s7main_"+g_main_name+".c";
		var fn_c_64=g_work_dir+"/s7main64_"+g_main_name+".c";
		var fn_c_bi=g_work_dir+"/s7main_bi_"+g_main_name+".c";
		if(IsNewerThan(fn_c_32,fn_c_64)){
			//64-bit build
			var jc_cmdline=[g_root+"/bin/win32_release/jc.exe","--64","-a"+g_arch,"-b"+g_build,"-c","--c="+fn_c_64];
			if(g_json.is_library){
				jc_cmdline.push('--shared');
			}
			for(var i=0;i<g_json.input_files.length;i++){
				jc_cmdline.push(g_json.input_files);
			}
			shell(jc_cmdline);
		}
		var got_original_main_c=0;
		for(var i=0;i<g_json.c_files.length;i++){
			if(g_base_dir+"/"+g_json.c_files[i]==fn_c_32||g_json.c_files[i]==fn_c_32){
				got_original_main_c=1;
				g_json.c_files[i]=fn_c_bi;
				break;
			}
		}
		if(!got_original_main_c){
			print(JSON.stringify(g_json.c_files),fn_c_32)
			throw new Error("cannot find s7main_bi_"+g_main_name+".c in c_files")
		}
		var s_c_64=ReadFile(fn_c_64)
		var s_c_32=ReadFile(fn_c_32)
		CreateIfDifferent(fn_c_bi,
			['#if __LP64__\n',
				s_c_64,
			'\n#else\n',
				s_c_32,
			'\n#endif\n'].join(''))
	}
	//////////////////////////////////////
	//build the project in the work dir
	//icon: ic_launcher.png resampling
	if(g_json.icon_file){
		var fn_icon=SearchForFile(g_json.icon_file[0]);
		var fntouch=g_work_dir+"/touch/ic_launcher.png._touch"
		if(IsNewerThan(fn_icon,fntouch)){
			mkdir(g_work_dir+'/res/drawable-xxhdpi/')
			mkdir(g_work_dir+'/res/drawable-xhdpi/')
			mkdir(g_work_dir+'/res/drawable-hdpi/')
			mkdir(g_work_dir+'/res/drawable-mdpi/')
			ResampleImage(fn_icon,g_work_dir+'/res/drawable-xxhdpi/ic_launcher.png',144,144)
			ResampleImage(fn_icon,g_work_dir+'/res/drawable-xhdpi/ic_launcher.png',96,96)
			ResampleImage(fn_icon,g_work_dir+'/res/drawable-hdpi/ic_launcher.png',72,72)
			ResampleImage(fn_icon,g_work_dir+'/res/drawable-mdpi/ic_launcher.png',48,48)
			CreateFile(fntouch,fn_icon)
		}
	}
	//copy Java wrappers
	if(g_json.java_files){
		for(var i=0;i<g_json.java_files.length;i++){
			CopyJavaFile(g_json.java_files[i])
		}
	}else{
		mkdir(g_work_dir+"/src")
	}
	if(g_json.jar_files){
		for(var i=0;i<g_json.jar_files.length;i++){
			CopyJarFile(g_json.jar_files[i])
		}
	}
	//copy-in the C files, which includes s7main.c
	mkdir(g_work_dir+"/jni")
	//for(var i=0;i<g_json.h_files.length;i++){
	//	var fn=SearchForFile(g_json.h_files[i]);
	//	UpdateTo(g_work_dir+"/jni/"+RemovePath(fn),fn)
	//}
	var c_files=CreateProjectForStandardFiles(g_work_dir+"/jni/")
	for(var i=0;i<c_files.length;i++){
		ANDROID.c_file_list.push(c_files[i])
	}
	//System.loadLibrary("SDL2_image");
	if(!g_json.is_library){
		//no SDL for libraries
		mkdir(g_work_dir+"/src/org/libsdl/app")
		var s_load_other_libs=[]
		if(g_json.android_libnames){
			for(var j=0;g_json.android_libnames[j];j++){
				s_load_other_libs.push('System.loadLibrary("'+g_json.android_libnames[j]+'");')
				//s_load_other_libs.push('"'+g_json.android_libnames[j]+'",')
			}
		}
		var s_sdl_activity=ReadFile(ANDROID.skeleton+"/src/org/libsdl/app/SDLActivity.java").replace('System.loadLibrary("SDL2");',s_load_other_libs.join(""))
		//var s_sdl_activity=ReadFile(ANDROID.skeleton+"/src/org/libsdl/app/SDLActivity.java").replace('// "SDL2_image",',s_load_other_libs.join(""))
		CreateIfDifferent(g_work_dir+"/src/org/libsdl/app/SDLActivity.java",s_sdl_activity)
	}
	//hack case for the idiotic javac
	//mv(g_work_dir+"/src/org/libsdl/app/SDLActivity.java",g_work_dir+"/src/org/libsdl/app/_SDLActivity.java")
	//mv(g_work_dir+"/src/org/libsdl/app/_SDLActivity.java",g_work_dir+"/src/org/libsdl/app/SDLActivity.java")
	var abis
	//if(ANDROID.is_release){
	//	abis=['armeabi','armeabi-v7a','x86']
	//}else{
	//	abis=['armeabi-v7a','x86']
	//}
	abis=['armeabi-v7a','x86']
	if(g_json.android_enable_arm64){
		abis.push('arm64-v8a','x86_64');
	}
	if(!g_json.is_library){
		//no SDL for libraries
		CopySkeletonFile("/jni/src/main/android","SDL_android_main.c")
		CopySkeletonFile("/jni/src","SDL_internal.h")
		//for(var i=0;i<abis.length;i++){
		//	var abi_i=abis[i]
		//	CopySkeletonFile("/jni/"+abi_i,"libSDL2.so","/libs/"+abi_i)
		//}
	}
	if(g_json.dll_files){
		for(var i=0;i<abis.length;i++){
			var abi_i=abis[i]
			var star=g_work_dir+"/jni/"+abi_i
			if(!DirExists(star)){
				mkdir(star)
			}
		}
		for(var j=0;g_json.dll_files[j];j++){
			for(var i=0;i<abis.length;i++){
				var abi_i=abis[i]
				var ssrc=g_json.dll_files[j]+"/"+abi_i;
				var star=g_work_dir+"/jni/"+abi_i+"/"
				var files=ls(ssrc+"/*")
				if(files.length<1){
					die("error> can't find '"+ssrc+"/*'\n")
				}
				for(var k=0;k<files.length;k++){
					UpdateTo(star+RemovePath(files[k]),files[k])
				}
			}
		}
	}
	mkdir(g_work_dir+"/trash")
	//generate ndk makefiles
	var s_android_mk=[]
	s_android_mk.push('LOCAL_PATH := $(call my-dir)\n')
	//////////////////////////
	//s_android_mk.push('include $(CLEAR_VARS)\n')
	//s_android_mk.push('LOCAL_MODULE := SDL2\n')
	//s_android_mk.push('LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/libSDL2.so\n')
	//s_android_mk.push('LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../trash\n')
	//s_android_mk.push('include $(PREBUILT_SHARED_LIBRARY)\n')
	//////////////////////////
	//libs
	for(var j=0;g_json.android_libnames&&g_json.android_libnames[j];j++){
		var libname=g_json.android_libnames[j]
		s_android_mk.push('include $(CLEAR_VARS)\n')
		s_android_mk.push('LOCAL_MODULE := '+libname+'\n')
		s_android_mk.push('LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/lib'+libname+'.so\n')
		s_android_mk.push('LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../trash\n')
		s_android_mk.push('include $(PREBUILT_SHARED_LIBRARY)\n')
	}
	for(var j=0;g_json.android_static_libnames&&g_json.android_static_libnames[j];j++){
		var libname=g_json.android_static_libnames[j]
		s_android_mk.push('include $(CLEAR_VARS)\n')
		s_android_mk.push('LOCAL_MODULE := lib'+libname+'\n')
		s_android_mk.push('LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/lib'+libname+'.a\n')
		s_android_mk.push('LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../trash\n')
		s_android_mk.push('include $(PREBUILT_STATIC_LIBRARY)\n')
	}
	//////////////////////////
	s_android_mk.push('include $(CLEAR_VARS)\n')
	if(g_json.is_library){
		s_android_mk.push('LOCAL_MODULE := '+g_main_name+'\n')
		s_android_mk.push('LOCAL_C_INCLUDES := ')
	}else{
		s_android_mk.push('LOCAL_MODULE := main\n')
		s_android_mk.push('LOCAL_C_INCLUDES := "'+
			"$(LOCAL_PATH)/sdl/include"+'" "'+
			"$(LOCAL_PATH)/sdl/src"+'"')
	}
	if(g_json.c_include_paths){
		for(var i=0;i<g_json.c_include_paths.length;i++){
			var s_include_path=g_json.c_include_paths[i];
			if(DirExists(g_work_dir+"/jni/"+s_include_path)){
				s_android_mk.push(' "$(LOCAL_PATH)/jni/'+s_include_path+'"');
			}else if(DirExists(s_include_path)){
				s_android_mk.push(' "'+s_include_path+'"');
			}
		}
	}
	s_android_mk.push('\n')
	s_android_mk.push('LOCAL_SRC_FILES := '+ANDROID.c_file_list.join(" "))
	s_android_mk.push('\n')
	//-ffast-math
	if(ANDROID.is_release){
		//s_android_mk.push('ifeq ($(TARGET_ARCH_ABI), x86)\n\tLOCAL_CFLAGS += -O3 -ffast-math -mtune=atom -msse3 -mfpmath=sse\nelse\n\tLOCAL_CFLAGS += -O3 -ffast-math\nendif\n')
		//else\n\
		//	LOCAL_CFLAGS += -ffast-math\n\
		s_android_mk.push('\n\
			ifeq ($(TARGET_ARCH_ABI),x86)\n\
				LOCAL_CFLAGS += -mtune=atom -msse2 -mfpmath=sse -DHAS_SSE -DNEED_MAIN_WRAPPING\n\
			else \n\
				ifeq ($(TARGET_ARCH_ABI),armeabi-v7a)\n\
					LOCAL_CFLAGS += -mfloat-abi=softfp -mfpu=neon -DHAS_NEON -DNEED_MAIN_WRAPPING\n\
				endif\n\
			endif\n')
		if(g_json.android_use_clang&&parseInt(g_json.android_use_clang[0])){
			s_android_mk.push('LOCAL_CFLAGS += -O3 -DPM_RELEASE -std=c99 -fomit-frame-pointer\n')
		}else{
			s_android_mk.push('LOCAL_CFLAGS += -O3 -fno-var-tracking-assignments -DPM_RELEASE -std=c99 -fomit-frame-pointer\n')
		}
	}else{
		//-ffast-math
		if(g_json.android_use_clang&&parseInt(g_json.android_use_clang[0])){
			s_android_mk.push('LOCAL_CFLAGS += -O0 -std=c99\n')
		}else{
			s_android_mk.push('LOCAL_CFLAGS += -O0 -fno-var-tracking-assignments -std=c99\n')
		}
	}
	if(g_json.is_library){
		//s_android_mk.push('LOCAL_CFLAGS += -DPM_IS_LIBRARY\n')
	}else{
		s_android_mk.push('LOCAL_CFLAGS += -DNEED_MAIN_WRAPPING\n')
	}
	if(g_json.cflags){
		s_android_mk.push('LOCAL_CFLAGS += ')
		for(var i=0;i<g_json.cflags.length;i++){
			var smain=g_json.cflags[i];
			s_android_mk.push(" "+smain);
		}
		s_android_mk.push('\n')
	}
	s_android_mk.push('ifeq ($(TARGET_ARCH_ABI),x86)\n')
	s_android_mk.push('\tLOCAL_CFLAGS += -DANDROID_X86\n')
	s_android_mk.push('else\n')
	s_android_mk.push('\tifeq ($(TARGET_ARCH_ABI),x86_64)\n')
	s_android_mk.push('\t\tLOCAL_CFLAGS += -DANDROID_X86 -DANDROID_X64\n')
	s_android_mk.push('\telse\n')
	s_android_mk.push('\t\tLOCAL_CFLAGS += -DANDROID_ARM -DHAS_NEON\n')
	s_android_mk.push('\t\tifeq ($(TARGET_ARCH_ABI),arm64-v8a)\n')
	s_android_mk.push('\t\t\tLOCAL_CFLAGS += -march=armv8-a \n')
	s_android_mk.push('\t\telse\n')
	s_android_mk.push('\t\t\tLOCAL_CFLAGS += -mfpu=neon \n')
	s_android_mk.push('\t\tendif\n')
	s_android_mk.push('\tendif\n')
	s_android_mk.push('endif\n')
	if(g_json.ldflags){
		s_android_mk.push('LOCAL_LDFLAGS += ')
		for(var j=0;j<g_json.ldflags.length;j++){
			s_android_mk.push(' '+g_json.ldflags[j])
		}
		s_android_mk.push('\n')
	}
	s_android_mk.push('LOCAL_SHARED_LIBRARIES := ')
	for(var j=0;g_json.android_libnames&&g_json.android_libnames[j];j++){
		s_android_mk.push(' '+g_json.android_libnames[j])
	}
	s_android_mk.push('\n')
	s_android_mk.push('LOCAL_STATIC_LIBRARIES := ')
	for(var j=0;g_json.android_system_static_libnames&&g_json.android_system_static_libnames[j];j++){
		s_android_mk.push(' '+g_json.android_system_static_libnames[j])
	}
	for(var j=0;g_json.android_static_libnames&&g_json.android_static_libnames[j];j++){
		s_android_mk.push(' '+g_json.android_static_libnames[j])
	}
	s_android_mk.push('\n')
	s_android_mk.push('LOCAL_LDLIBS := -llog -landroid -L$(LOCAL_PATH)/$(TARGET_ARCH_ABI)/ ')
	//for(var j=0;g_json.android_static_libnames&&g_json.android_static_libnames[j];j++){
	//	s_android_mk.push(' -l'+g_json.android_static_libnames[j])
	//}
	if(!g_json.is_library){
		s_android_mk.push(' -lGLESv2')
	}
	for(var j=0;g_json.android_system_libnames&&g_json.android_system_libnames[j];j++){
		s_android_mk.push(' -l'+g_json.android_system_libnames[j])
	}
	s_android_mk.push('\n')
	if(g_json.android_build_static_library||g_json.is_library&&parseInt(g_json.is_library[0])===2){
		s_android_mk.push('include $(BUILD_STATIC_LIBRARY)\n')
	}else{
		s_android_mk.push('include $(BUILD_SHARED_LIBRARY)\n')
	}
	for(var j=0;g_json.android_import_modules&&g_json.android_import_modules[j];j++){
		s_android_mk.push(g_json.android_import_modules[j],'\n')
	}
	CreateIfDifferent(g_work_dir+"/jni/Android.mk",s_android_mk.join(""))
	var s_application_mk=[];
	s_application_mk.push("APP_SHORT_COMMANDS := true\n")
	if(g_json.android_stl){
		s_application_mk.push("APP_STL :=")
		s_application_mk.push(g_json.android_stl[0]);
		s_application_mk.push("\n")
	}
	if(g_json.android_cppflags){
		s_application_mk.push("APP_CPPFLAGS +=")
		for(var j=0;j<g_json.android_cppflags.length;j++){
			s_application_mk.push(' ')
			s_application_mk.push(g_json.android_cppflags[j])
		}
		s_application_mk.push("\n")
	}
	s_application_mk.push("APP_ABI :=")
	for(var i=0;i<abis.length;i++){
		var abi_i=abis[i]
		s_application_mk.push(" "+abi_i)
	}
	s_application_mk.push("\nAPP_PLATFORM := android-9\n")
	if(g_json.application_mk){
		for(var j=0;j<g_json.application_mk.length;j++){
			s_application_mk.push('\n')
			s_application_mk.push(g_json.application_mk[j])
			s_application_mk.push('\n')
		}
	}
	if(g_json.android_use_clang&&parseInt(g_json.android_use_clang[0])){
		s_application_mk.push("\nNDK_TOOLCHAIN_VERSION := clang\n")
	}
	//if(g_json.android_use_gcc&&parseInt(g_json.android_use_gcc[0])){
	//	s_application_mk.push("\nNDK_TOOLCHAIN_VERSION := gcc\n")
	//}
	CreateIfDifferent(g_work_dir+"/jni/Application.mk",s_application_mk.join(""))
	//fill strings.xml, AndroidManifest.xml, build.xml, add the main java file
	//////////
	var splatform=GetMainFileName(ANDROID.adt_platform);
	CreateIfDifferent(g_work_dir+"/ant.properties",'java.compilerargs=-J-Duser.language=en\nndk.dir='+ANDROID.ndk+'\n')
	CreateIfDifferent(g_work_dir+"/project.properties",'target='+splatform+'\n')
	CreateIfDifferent(g_work_dir+"/local.properties",'sdk.dir='+ANDROID.adt+'/sdk'+'\n')
	//////////
	var xml=ParseXML(ReadFile(ANDROID.skeleton+"/AndroidManifest.xml"))
	XML_SetNodeAttrValue(XML_Child(xml,"manifest"),"package","com.spap."+g_main_name)
	var xml_activity=XML_Child(XML_Child(XML_Child(xml,"manifest"),"application"),"activity")
	XML_SetNodeAttrValue(xml_activity,"android:name","spap_main")
	var match=splatform.match(new RegExp("android-(.+)"))
	XML_SetNodeAttrValue(XML_Child(XML_Child(xml,"manifest"),"uses-sdk"),"android:targetSdkVersion",match[1])
	var xml_manifest=XML_Child(xml,"manifest")
	if(g_json.android_permissions){
		for(var i=0;i<g_json.android_permissions.length;i++){
			var xml_perm=XML_AddChild(xml_manifest,"uses-permission")
			XML_SetNodeAttrValue(xml_perm,"android:name",g_json.android_permissions[i])
		}
	}
	for(var i=0;g_json.android_features&&g_json.android_features[i];i++){
		var xml_perm=XML_AddChild(xml_manifest,"uses-feature")
		XML_SetNodeAttrValue(xml_perm,"android:name",g_json.android_features[i])
	}
	for(var i=0;g_json.android_optional_features&&g_json.android_optional_features[i];i++){
		var xml_perm=XML_AddChild(xml_manifest,"uses-feature")
		XML_SetNodeAttrValue(xml_perm,"android:name",g_json.android_optional_features[i])
		XML_SetNodeAttrValue(xml_perm,"android:required","false")
	}
	//if(g_json.android_force_orientation){
	//	XML_SetNodeAttrValue(xml_activity,"android:screenOrientation",g_json.android_force_orientation[0])
	//	//XML_SetNodeAttrValue(xml_activity,"android:configChanges","keyboardHidden")
	//}
	for(var i=0;g_json.android_activity_manifest&&g_json.android_activity_manifest[i];i++){
		var s=g_json.android_activity_manifest[i].split('=');
		XML_SetNodeAttrValue(xml_activity,s[0],s[1]);
	}
	//moved to gui2d.jc
	//XML_SetNodeAttrValue(xml_activity,"android:configChanges","orientation|screenSize|keyboard|keyboardHidden")
	CreateIfDifferent(g_work_dir+"/AndroidManifest.xml",XML_ToString(xml))
	//////////
	xml=ParseXML(ReadFile(ANDROID.skeleton+"/build.xml"))
	XML_SetNodeAttrValue(XML_Child(xml,"project"),"name",g_main_name)
	CreateIfDifferent(g_work_dir+"/build.xml",XML_ToString(xml))
	//////////
	mkdir(g_work_dir+"/res/values")
	xml=ParseXML(ReadFile(ANDROID.skeleton+"/res/values/strings.xml"))
	XML_SetNodeAttrValue(XML_Child(XML_Child(xml,"resources"),"string"),"",(g_json.app_display_name&&g_json.app_display_name[0]||g_main_name))
	CreateIfDifferent(g_work_dir+"/res/values/strings.xml",XML_ToString(xml))
	//////////
	if(!g_json.is_library){
		mkdir(g_work_dir+"/src/com/spap/"+g_main_name)
		CreateIfDifferent(g_work_dir+"/src/com/spap/"+g_main_name+"/spap_main.java","package com.spap."+g_main_name+";\nimport org.libsdl.app.SDLActivity;\npublic class spap_main extends SDLActivity{}\n")
	}
	////////////////////////////////////////////
	//ndk make step
	var sexe_ndk_build=ANDROID.ndk+'/ndk-build.cmd'
	cd(g_work_dir+"/jni")
	var ret=shell([sexe_ndk_build])
	if(ret!=0){
		die('NDK failed')
	}
	cd(s_original_dir)
	////////////////////////////////////////////
	//call ant
	//todo: library mode - just so and jar
	var s_ant_bat='@echo off\nset PATH=%PATH%;'+ANDROID.jdk+'\nset JAVA_HOME='+ANDROID.jdk+'\n';
	if(g_json.is_library){
		s_ant_bat=s_ant_bat+'call "'+ANDROID.ant_home+"/bin/ant.bat"+'" '+(ANDROID.is_release?"jar_release\n":"jar\n");
	}else{
		s_ant_bat=s_ant_bat+'call "'+ANDROID.ant_home+"/bin/ant.bat"+'" '+(ANDROID.is_release?"release\n":"debug\n");
	}
	CreateFile(g_work_dir+"/build.bat",s_ant_bat)
	cd(g_work_dir)
	shell(["build.bat"])
	cd(s_original_dir)
	if(g_json.is_library){
		var fnjar=g_work_dir+"/bin/javapart.jar"
		if(!FileExists(fnjar)){
			die('ant failed')
		}
		shell(["cp",fnjar,g_bin_dir+"/"+g_main_name+".jar"])
		shell(["rm","-rf",g_bin_dir+"/libs"])
		if(g_json.android_build_static_library||g_json.is_library&&parseInt(g_json.is_library[0])===2){
			for(var i=0;i<abis.length;i++){
				mkdir(g_bin_dir+"/libs/"+abis[i])
				shell(["cp",g_work_dir+"/obj/local/"+abis[i]+"/lib"+g_main_name+".a",g_bin_dir+"/libs/"+abis[i]+"/"])
			}
		}else{
			shell(["cp","-r",g_work_dir+"/libs",g_bin_dir+"/libs"])
		}
	}else{
		var fnapk;
		if(ANDROID.is_release){
			fnapk=g_work_dir+"/bin/"+g_main_name+"-release-unsigned.apk"
		}else{
			fnapk=g_work_dir+"/bin/"+g_main_name+"-debug.apk"
		}
		if(!FileExists(fnapk)){
			die('ant failed')
		}
		if(ANDROID.is_release){
			//generate key
			var fnkeytool=ANDROID.jdk+"/bin/keytool.exe"
			var fnks=g_base_dir+"/spap_release.keystore"
			if(!FileExists(fnks)){
				shell([fnkeytool,'-J-Duser.language=en','-v','-keysize','2048','-keystore',fnks,'-alias','spapkey','-keyalg','RSA','-validity','10000','-genkey','-storepass','spapkey','-keypass','spapkey','-dname','CN=SPAP Release,OU=SPAP,O=SPAP,L=SPAP,ST=SPAP,C=US'])
			}
			var fnjarsigner=ANDROID.jdk+"/bin/jarsigner.exe"
			shell([fnjarsigner,'-J-Duser.language=en','-sigalg','SHA1withRSA','-digestalg','SHA1','-keystore',fnks,'-storepass','spapkey','-keypass','spapkey',fnapk,'spapkey'])
			var fnzipalign=ANDROID.adt+"/sdk/tools/zipalign.exe"
			if(FileExists(g_bin_dir+"/"+g_main_name+".apk")){
				shell(['rm',g_bin_dir+"/"+g_main_name+'.apk'])
			}
			shell([fnzipalign,'16',fnapk,g_bin_dir+"/"+g_main_name+".apk"])
		}else{
			shell(["mv",fnapk,g_bin_dir+"/"+g_main_name+".apk"])
		}
		var fnapk=g_bin_dir+"/"+g_main_name+".apk"
		if(!FileExists(fnapk)){
			die("somehow, the package hasn't been built")
		}
	}
};

g_action_handlers.run=function(){
	ANDROID.Detect()
	ANDROID.is_release=(g_build!="debug")
	//coulddo: Genymotion settings automation
	//HKEY_CURRENT_USER\Software\Genymobile\VMTools-Abstract\configuration_android_sdk_path
	//HKEY_CURRENT_USER\Software\Genymobile\VMTools-Abstract\configuration_connect_adb
	var fnapk=g_bin_dir+"/"+g_main_name+".apk"
	if(!FileExists(fnapk)){
		die("the package hasn't been built")
	}
	var fntouch=g_work_dir+"/"+g_main_name+"_apk_installed._touch"
	if(IsNewerThan(fnapk,fntouch)){
		CreateFile(fntouch,fnapk)
		shell([ANDROID.adb_exe,'uninstall','com.spap.'+g_main_name])
		var ret=shell([ANDROID.adb_exe,'install','-r',fnapk])
		if(ret!=0){die('failed to install the package');}
	}
	shell([ANDROID.adb_exe,'logcat','-c'])
	var args_run=[ANDROID.adb_exe,'shell','am','start'];
	//if(g_build=="debug"){args_run.push('--opengl-trace');}
	args_run.push('-n','com.spap.'+g_main_name+'/com.spap.'+g_main_name+'.spap_main')
	shell(args_run)
	shell([ANDROID.adb_exe,'logcat','-v','raw','-s','STDOUT'])
}
