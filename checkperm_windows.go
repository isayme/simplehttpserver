//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
)

// checkDirReadWrite verifies a directory has read and write permissions on
// Windows. The unix.Access syscall is unavailable, so permission is probed at
// runtime: read access by opening the directory, write access by creating and
// removing a temporary file inside it.
func checkDirReadWrite(dir string) error {
	if _, err := os.Open(dir); err != nil {
		return fmt.Errorf("cannot read: %w", err)
	}

	tmp, err := os.CreateTemp(dir, ".checkperm-*")
	if err != nil {
		return fmt.Errorf("cannot write: %w", err)
	}
	name := tmp.Name()
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Remove(name); err != nil {
		return fmt.Errorf("cannot remove temp file %s: %w", filepath.Base(name), err)
	}

	return nil
}
