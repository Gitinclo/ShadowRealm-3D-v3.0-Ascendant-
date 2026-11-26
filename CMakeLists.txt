cmake_minimum_required(VERSION 3.18)
project(ShadowRealm VERSION 3.0.0 LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

message(STATUS "Building ShadowRealm 3D v${PROJECT_VERSION}")
message(STATUS "Platform: ${CMAKE_SYSTEM_NAME} | Generator: ${CMAKE_GENERATOR}")

option(SHADOWREALM_ENABLE_VULKAN "Build experimental Android Vulkan target instead of GLES 3.2" OFF)

# ============================================================================
#  DESKTOP BUILD (Linux / macOS / Windows)
# ============================================================================
if(NOT ANDROID)
    message(STATUS "Desktop build mode (OpenGL 3.3 Core + GLFW + GLM + Dear ImGui)")

    find_package(OpenGL REQUIRED)

    include(FetchContent)
    FetchContent_Declare(
        glad
        GIT_REPOSITORY https://github.com/Dav1dde/glad.git
        GIT_TAG        v2.0.8
        SOURCE_SUBDIR  cmake
    )
    FetchContent_MakeAvailable(glad)
    glad_add_library(glad_gl REPRODUCIBLE LOADER API gl:core=3.3)

    find_package(glfw3 3.3 QUIET)
    if(NOT glfw3_FOUND)
        find_library(GLFW_LIB NAMES glfw3 glfw)
        if(NOT GLFW_LIB)
            message(FATAL_ERROR "GLFW3 not found! Install libglfw3-dev (Linux), brew install glfw (macOS), or vcpkg install glfw3 (Windows).")
        endif()
    endif()

    if(NOT EXISTS "${CMAKE_SOURCE_DIR}/glm/glm/glm.hpp")
        message(FATAL_ERROR "GLM not found at glm/glm/glm.hpp. Clone https://github.com/g-truc/glm.git into glm/.")
    endif()

    if(NOT EXISTS "${CMAKE_SOURCE_DIR}/imgui/imgui.h"
       OR NOT EXISTS "${CMAKE_SOURCE_DIR}/imgui/backends/imgui_impl_glfw.cpp"
       OR NOT EXISTS "${CMAKE_SOURCE_DIR}/imgui/backends/imgui_impl_opengl3.cpp")
        message(FATAL_ERROR "Dear ImGui (with GLFW and OpenGL3 backends) not found under imgui/.")
    endif()

    if(NOT EXISTS "${CMAKE_SOURCE_DIR}/main_desktop.cpp")
        message(FATAL_ERROR "main_desktop.cpp not found in project root.")
    endif()

    set(IMGUI_SOURCES
        imgui/imgui.cpp
        imgui/imgui_draw.cpp
        imgui/imgui_tables.cpp
        imgui/imgui_widgets.cpp
        imgui/backends/imgui_impl_glfw.cpp
        imgui/backends/imgui_impl_opengl3.cpp
    )

    add_executable(shadowrealm
        main_desktop.cpp
        Causality.h
        ${IMGUI_SOURCES}
    )

    target_include_directories(shadowrealm PRIVATE
        ${CMAKE_SOURCE_DIR}
        ${CMAKE_SOURCE_DIR}/imgui
        ${CMAKE_SOURCE_DIR}/imgui/backends
        ${CMAKE_SOURCE_DIR}/glm
    )

    target_link_libraries(shadowrealm PRIVATE glad_gl)

    if(TARGET OpenGL::GL)
        target_link_libraries(shadowrealm PRIVATE OpenGL::GL)
    elseif(TARGET OpenGL::OpenGL)
        target_link_libraries(shadowrealm PRIVATE OpenGL::OpenGL)
    else()
        target_link_libraries(shadowrealm PRIVATE ${OPENGL_LIBRARIES})
    endif()

    if(glfw3_FOUND)
        target_link_libraries(shadowrealm PRIVATE glfw)
    else()
        target_link_libraries(shadowrealm PRIVATE ${GLFW_LIB})
    endif()

    if(APPLE)
        target_link_options(shadowrealm PRIVATE
            -framework Cocoa -framework IOKit -framework CoreVideo)
    elseif(UNIX)
        find_package(Threads REQUIRED)
        target_link_libraries(shadowrealm PRIVATE Threads::Threads ${CMAKE_DL_LIBS})
        find_library(X11_LIB X11)
        if(X11_LIB)
            target_link_libraries(shadowrealm PRIVATE ${X11_LIB})
        endif()
    endif()

    if(MSVC)
        if(CMAKE_BUILD_TYPE STREQUAL "Release")
            target_compile_options(shadowrealm PRIVATE /O2 /W4)
        else()
            target_compile_options(shadowrealm PRIVATE /Zi /W4)
        endif()
    else()
        if(CMAKE_BUILD_TYPE STREQUAL "Release")
            target_compile_options(shadowrealm PRIVATE -O3 -Wall -Wextra)
        else()
            target_compile_options(shadowrealm PRIVATE -g -Wall -Wextra)
        endif()
    endif()

# ============================================================================
#  ANDROID NDK BUILD (arm64-v8a)
# ============================================================================
else()
    message(STATUS "Android NDK build mode (ABI=${ANDROID_ABI}, API=${ANDROID_PLATFORM})")

    set(ANDROID_GLUE_DIR "${ANDROID_NDK}/sources/android/native_app_glue")
    if(NOT EXISTS "${ANDROID_GLUE_DIR}/android_native_app_glue.c")
        message(FATAL_ERROR "Android NDK native_app_glue not found at: ${ANDROID_GLUE_DIR}")
    endif()

    add_library(native_app_glue STATIC "${ANDROID_GLUE_DIR}/android_native_app_glue.c")
    target_include_directories(native_app_glue PUBLIC "${ANDROID_GLUE_DIR}")

    find_library(LIB_LOG log REQUIRED)
    find_library(LIB_ANDROID android REQUIRED)

    if(SHADOWREALM_ENABLE_VULKAN)
        find_library(LIB_VULKAN vulkan REQUIRED)
        add_library(shadowrealm SHARED main_android_vulkan.cpp)
        target_include_directories(shadowrealm PRIVATE "${ANDROID_GLUE_DIR}")
        target_link_libraries(shadowrealm PRIVATE native_app_glue ${LIB_VULKAN} ${LIB_LOG} ${LIB_ANDROID})
        message(STATUS "Configured Android Vulkan target: main_android_vulkan.cpp")
    else()
        find_library(LIB_GLES GLESv3 REQUIRED)
        find_library(LIB_EGL EGL REQUIRED)
        add_library(shadowrealm SHARED main_android.cpp)
        target_include_directories(shadowrealm PRIVATE ${CMAKE_SOURCE_DIR}/glm "${ANDROID_GLUE_DIR}")
        target_link_libraries(shadowrealm PRIVATE native_app_glue ${LIB_GLES} ${LIB_EGL} ${LIB_LOG} ${LIB_ANDROID})
        message(STATUS "Configured Android GLES 3.2 target: main_android.cpp")
    endif()

    target_compile_options(shadowrealm PRIVATE -fPIC -fvisibility=hidden -Wall -Wextra)
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        target_compile_options(shadowrealm PRIVATE -O3)
    else()
        target_compile_options(shadowrealm PRIVATE -g)
    endif()
endif()
