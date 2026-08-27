//go:build !windows

package main

import "golang.org/x/sys/unix"

// checkDirReadWrite verifies a directory has read and write permissions on
// Unix-like systems (Linux, macOS) using the access(2) syscall.
func checkDirReadWrite(dir string) error {
	return unix.Access(dir, unix.W_OK|unix.R_OK)
}
