package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	_ "embed"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	flag "github.com/spf13/pflag"
)

var (
	showVersion = flag.BoolP("version", "v", false, "show version")
	uploadDir   = flag.StringP("dir", "d", ".", "directory to store uploaded files")
	listenPort  = flag.Int16P("port", "p", 8080, "port to listen on")
	webPath     = flag.StringP("web-path", "", "", "web path for upload page")
)

var version = "dev"

//go:embed web/dist/index.html
var webContent string

func main() {
	flag.Lookup("web-path").NoOptDefVal = "/"

	flag.Parse()

	if *showVersion {
		fmt.Println("simplehttpserver", version)
		os.Exit(0)
	}

	if err := checkUploadDir(*uploadDir); err != nil {
		slog.Error("upload check failed", "err", err)
		os.Exit(1)
	}

	// Resolve to absolute path for consistent behavior
	absUploadDir, err := filepath.Abs(*uploadDir)
	if err != nil {
		slog.Error("failed to resolve -d path", "dir", *uploadDir, "err", err)
		os.Exit(1)
	}
	slog.Info("upload directory", "dir", *uploadDir, "absDir", absUploadDir)
	*uploadDir = absUploadDir

	e := echo.NewWithConfig(echo.Config{
		Logger: slog.Default(),
	})
	e.Use(middleware.RequestLogger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowCredentials: true,
		UnsafeAllowOriginFunc: func(c *echo.Context, origin string) (string, bool, error) {
			return origin, true, nil
		},
	}))

	e.Static("/", ".")
	if *webPath != "" {
		slog.Info("upload page enabled", "path", *webPath)
		e.GET(*webPath, func(c *echo.Context) error {
			return c.HTML(http.StatusOK, webContent)
		})
	} else {
		slog.Info("upload page disabled")
	}

	e.POST("/api/upload", uploadHander)

	addr := fmt.Sprintf(":%d", *listenPort)
	sc := echo.StartConfig{Address: addr}
	if err := sc.Start(context.Background(), e); err != nil {
		slog.Error("failed to start server", "error", err)
	}
}

func uploadHander(c *echo.Context) error {
	//------------
	// Read files
	//------------

	// Multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File["files"]

	for _, file := range files {
		// Source
		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		// Destination
		dstPath := filepath.Join(*uploadDir, file.Filename)
		dst, err := os.Create(dstPath)
		if err != nil {
			return err
		}
		defer dst.Close()

		// Copy
		if _, err = io.Copy(dst, src); err != nil {
			return err
		}

	}

	return c.HTML(http.StatusOK, fmt.Sprintf("<p>Uploaded successfully %d files.</p>", len(files)))
}

func checkUploadDir(dir string) error {
	// Validate upload directory
	if info, err := os.Stat(dir); err == nil {
		// Path exists, check if it's a directory
		if !info.IsDir() {
			return fmt.Errorf("-d path exists but is not a directory: %s\n", dir)
		}
		// Check read/write permissions
		if err := checkDirReadWrite(dir); err != nil {
			return fmt.Errorf("-d path lacks read/write permission: %s: %v\n", dir, err)
		}
	} else if os.IsNotExist(err) {
		// Path doesn't exist, create it
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("error: failed to create -d directory: %s: %v\n", dir, err)
		}
	} else {
		return fmt.Errorf("error: failed to access -d path: %s: %v\n", dir, err)
	}

	return nil
}
