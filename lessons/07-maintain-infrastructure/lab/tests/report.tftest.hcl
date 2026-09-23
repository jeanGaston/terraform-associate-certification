# Run with: terraform test
# Each run block executes a plan or apply in an isolated, temporary state and checks assertions.

run "report_path_is_correct" {
  command = plan

  assert {
    condition     = endswith(local_file.report.filename, "output/report.txt")
    error_message = "Report must be written to output/report.txt"
  }
}

run "session_id_has_expected_length" {
  command = apply

  assert {
    condition     = length(random_id.session.hex) == 8
    error_message = "4 random bytes should produce 8 hex characters"
  }
}
