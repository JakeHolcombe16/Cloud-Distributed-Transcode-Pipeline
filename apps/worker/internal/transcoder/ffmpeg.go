package transcoder

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
)

// Profile defines encoding settings - extensible for future options
type Profile struct {
	Name       string // "480p", "720p", "1080p"
	Scale      string // FFmpeg scale filter: "-2:480"
	VideoCodec string // "libx264", "libx265", etc.
	AudioCodec string // "aac", "copy", etc.
	Preset     string // "fast", "medium", "slow"
	// Other fields, not currently used
	// Bitrate     string
	// CRF         int
	// Deinterlace bool
}

// DefaultProfiles contains the standard transcoding profiles for MVP
// This map is extensible - add new profiles or modify existing ones as needed
var DefaultProfiles = map[string]Profile{
	"480p": {
		Name:       "480p",
		Scale:      "-2:480",
		VideoCodec: "libx264",
		AudioCodec: "aac",
		Preset:     "fast",
	},
	"720p": {
		Name:       "720p",
		Scale:      "-2:720",
		VideoCodec: "libx264",
		AudioCodec: "aac",
		Preset:     "fast",
	},
	"1080p": {
		Name:       "1080p",
		Scale:      "-2:1080",
		VideoCodec: "libx264",
		AudioCodec: "aac",
		Preset:     "fast",
	},
}

// GetProfile returns the profile for the given resolution name
// Returns an error if the profile is not found
func GetProfile(resolution string) (Profile, error) {
	profile, ok := DefaultProfiles[resolution]
	if !ok {
		return Profile{}, fmt.Errorf("unknown resolution profile: %s", resolution)
	}
	return profile, nil
}

// Transcode executes FFmpeg to transcode the input file to the specified resolution
// It uses the default profile for the given resolution
func Transcode(ctx context.Context, inputPath, outputPath, resolution string) error {
	profile, err := GetProfile(resolution)
	if err != nil {
		return err
	}

	return TranscodeWithProfile(ctx, inputPath, outputPath, profile)
}

// TranscodeWithProfile executes FFmpeg with the given profile settings
// This allows for custom profiles beyond the defaults
func TranscodeWithProfile(ctx context.Context, inputPath, outputPath string, profile Profile) error {
	// Build FFmpeg arguments
	args := []string{
		"-i", inputPath,
		"-vf", fmt.Sprintf("scale=%s", profile.Scale),
		"-c:v", profile.VideoCodec,
		"-preset", profile.Preset,
		"-c:a", profile.AudioCodec,
		"-y",
		outputPath,
	}

	// Create command with context for cancellation support
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	// Capture stderr for error reporting (FFmpeg outputs to stderr)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	// Run the command
	if err := cmd.Run(); err != nil {
		// Include FFmpeg's stderr output in the error for debugging
		return fmt.Errorf("ffmpeg failed: %w\nOutput: %s", err, stderr.String())
	}

	return nil
}
